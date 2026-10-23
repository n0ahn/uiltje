// The question bank (phase 9): extra practice questions written by the AI around items of the syllabus catalogue,
// checked by a second AI pass and approved by the owner before anyone sees them. Pure TS (no Svelte, DOM or Supabase).
//
// The ANSWER of every question is the catalogue term of its `ref` (resolved in code), never text from the AI, so
// all answers come from the syllabus. The AI only writes the sentence or the description around it.
import { z } from 'zod';
import { resolveItem } from './catalogues';
import { answerVariants, maskTerm, type ConceptRow } from './rows';
import type { GrammarItem, GrammarSection } from './types';

export const QUESTION_KINDS = ['sentence', 'paraphrase'] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

export const QUESTION_STATUSES = ['draft', 'approved', 'rejected'] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export const LIMITS = { prompt: 600, translation: 600, explanation: 600, note: 400 } as const;
export const MAX_REFS_PER_REQUEST = 4;
export const MAX_PER_ITEM = 6;

/** A question in the database, as the owner sees it. */
export type BankQuestion = {
	id: string;
	ref: string;
	kind: QuestionKind;
	prompt: string;
	translation: string;
	explanation: string;
	status: QuestionStatus;
	/** Result of the second AI pass: true = ok, false = doubt or wrong, null = not checked. */
	checkOk: boolean | null;
	checkNote: string;
	createdAt: number;
};

/** What a normal user gets: approved questions only, without the owner's notes. */
export type ApprovedQuestion = { id: string; ref: string; kind: QuestionKind; prompt: string; translation: string };

/** A question as it comes out of the generator, before it is saved. */
export type Draft = { ref: string; kind: QuestionKind; prompt: string; translation: string; explanation: string; checkOk: boolean | null; checkNote: string };

// ---------------------------------------------------------------- which kinds make sense for an item

/** Items where a sentence of Latin or Greek cannot show the term in one line (they need a whole text or scansion). */
const PARAPHRASE_ONLY_SECTIONS = new Set(['retorica', 'herodotus-context']);
const PARAPHRASE_ONLY_ITEMS = new Set([
	'ringcompositie',
	'verteltempo',
	'vertelperspectief',
	'alwetende-verteller',
	'dramatische-ironie',
	'metrum',
	'klemtoon-lengte-1e-declinatie',
	'elisie',
	'metrum-inhoud',
	'enjambement',
	'homerische-vergelijking',
	'h-metrum',
	'h-metrum-inhoud',
	'h-enjambement',
	'h-homerische-vergelijking',
	'formule',
	'typische-scene',
	't-enjambement',
	'stichomythie',
	'epanalepsis',
	'kop-staartconstructie',
	's-congruentie'
]);

export function allowedKinds(section: Pick<GrammarSection, 'id'>, item: Pick<GrammarItem, 'id'>): QuestionKind[] {
	return PARAPHRASE_ONLY_SECTIONS.has(section.id) || PARAPHRASE_ONLY_ITEMS.has(item.id) ? ['paraphrase'] : ['sentence', 'paraphrase'];
}

// ---------------------------------------------------------------- request and AI output

export const GenerateRequestSchema = z.object({
	refs: z.array(z.string().min(3).max(120)).min(1).max(MAX_REFS_PER_REQUEST),
	perItem: z.number().int().min(1).max(MAX_PER_ITEM)
});
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export const AiQuestionsSchema = z.object({
	items: z
		.array(
			z.object({
				ref: z.string(),
				questions: z
					.array(
						z.object({
							kind: z.enum(QUESTION_KINDS).catch('paraphrase'),
							prompt: z.string().default(''),
							translation: z.string().default(''),
							explanation: z.string().default('')
						})
					)
					.default([])
			})
		)
		.default([])
});
export type AiQuestions = z.infer<typeof AiQuestionsSchema>;

export const AiChecksSchema = z.object({
	results: z
		.array(
			z.object({
				id: z.string(),
				verdict: z.enum(['ok', 'twijfel', 'fout']).catch('twijfel'),
				note: z.string().default('')
			})
		)
		.default([])
});
export type AiChecks = z.infer<typeof AiChecksSchema>;

/** Hand-written JSON Schemas for Gemini (common subset only, like schema/ai.ts). */
export const QUESTIONS_JSON_SCHEMA = {
	type: 'object',
	properties: {
		items: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					ref: { type: 'string', description: 'The ref of the item, copied exactly.' },
					questions: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								kind: { type: 'string', enum: [...QUESTION_KINDS] },
								prompt: { type: 'string' },
								translation: { type: 'string' },
								explanation: { type: 'string' }
							},
							required: ['kind', 'prompt', 'translation', 'explanation']
						}
					}
				},
				required: ['ref', 'questions']
			}
		}
	},
	required: ['items']
} as const;

export const CHECKS_JSON_SCHEMA = {
	type: 'object',
	properties: {
		results: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					verdict: { type: 'string', enum: ['ok', 'twijfel', 'fout'] },
					note: { type: 'string' }
				},
				required: ['id', 'verdict', 'note']
			}
		}
	},
	required: ['results']
} as const;

// ---------------------------------------------------------------- cleaning what the AI wrote

export type DropReason = 'kind' | 'empty' | 'too-long' | 'gives-answer' | 'duplicate' | 'no-translation';

export type CleanResult = { kept: Omit<Draft, 'checkOk' | 'checkNote'>[]; dropped: { reason: DropReason; prompt: string }[] };

const norm = (text: string) => text.normalize('NFC').toLowerCase().replace(/\s+/gu, ' ').trim();

/**
 * Keeps what can be used and says why the rest was dropped. Rules that do not need an AI:
 * the kind must be allowed for the item, no empty or overlong text, a paraphrase must not contain the term itself,
 * a sentence needs a translation, and nothing may repeat an earlier question or a syllabus example.
 */
export function cleanQuestions(
	ref: string,
	term: string,
	allowed: readonly QuestionKind[],
	questions: AiQuestions['items'][number]['questions'],
	knownPrompts: readonly string[]
): CleanResult {
	const seen = new Set(knownPrompts.map(norm));
	const kept: CleanResult['kept'] = [];
	const dropped: CleanResult['dropped'] = [];
	for (const question of questions) {
		const prompt = question.prompt.trim();
		const translation = question.translation.trim();
		const explanation = question.explanation.trim();
		const drop = (reason: DropReason) => dropped.push({ reason, prompt });
		if (!allowed.includes(question.kind)) drop('kind');
		else if (prompt.length < 5 || explanation === '') drop('empty');
		else if (prompt.length > LIMITS.prompt || translation.length > LIMITS.translation || explanation.length > LIMITS.explanation) drop('too-long');
		else if (question.kind === 'sentence' && translation === '') drop('no-translation');
		else if (question.kind === 'paraphrase' && maskTerm(prompt, term) !== prompt) drop('gives-answer');
		else if (seen.has(norm(prompt))) drop('duplicate');
		else {
			seen.add(norm(prompt));
			kept.push({ ref, kind: question.kind, prompt, translation: question.kind === 'sentence' ? translation : '', explanation });
		}
	}
	return { kept, dropped };
}

/** Everything that is already known for an item, so the AI is not asked for it again. */
export function knownPromptsOf(item: Pick<GrammarItem, 'examples'>): string[] {
	return (item.examples ?? []).map((example) => example.text);
}

// ---------------------------------------------------------------- from approved question to practice row

/** The text a learner sees: a sentence shows its translation after a dash, like the syllabus examples. */
export function questionPrompt(question: Pick<ApprovedQuestion, 'kind' | 'prompt' | 'translation'>): string {
	return question.kind === 'sentence' && question.translation.trim() !== '' ? `${question.prompt.trim()} — ${question.translation.trim()}` : question.prompt.trim();
}

/** Rows for approved questions whose item still exists in the catalogue (the answer is the term from the syllabus). */
export function bankRows(questions: readonly ApprovedQuestion[]): ConceptRow[] {
	return questions.flatMap((question) => {
		const found = resolveItem(question.ref);
		if (!found) return [];
		return [{ prompt: questionPrompt(question), answers: answerVariants(found.item.term), ref: question.ref }];
	});
}

// ---------------------------------------------------------------- database rows

const optionalText = z.string().nullable().transform((value) => value ?? '');

export const BankRowSchema = z.object({
	id: z.string().min(1),
	ref: z.string().min(1),
	kind: z.enum(QUESTION_KINDS),
	prompt: z.string().min(1),
	translation: optionalText,
	explanation: optionalText,
	status: z.enum(QUESTION_STATUSES),
	check_ok: z.boolean().nullable(),
	check_note: optionalText,
	created_at: z.string()
});

export const ApprovedRowSchema = z.object({
	id: z.string().min(1),
	ref: z.string().min(1),
	kind: z.enum(QUESTION_KINDS),
	prompt: z.string().min(1),
	translation: optionalText
});

export function toBankQuestion(row: z.infer<typeof BankRowSchema>): BankQuestion {
	return {
		id: row.id,
		ref: row.ref,
		kind: row.kind,
		prompt: row.prompt,
		translation: row.translation,
		explanation: row.explanation,
		status: row.status,
		checkOk: row.check_ok,
		checkNote: row.check_note,
		createdAt: Date.parse(row.created_at) || 0
	};
}

export function toApprovedQuestion(row: z.infer<typeof ApprovedRowSchema>): ApprovedQuestion {
	return { id: row.id, ref: row.ref, kind: row.kind, prompt: row.prompt, translation: row.translation };
}

/** A Dutch message, or null, for an edit by the owner. */
export function validateEdit(input: { prompt: string; translation: string; explanation: string }, kind: QuestionKind): string | null {
	if (input.prompt.trim().length < 5) return 'De vraag is te kort.';
	if (input.prompt.length > LIMITS.prompt) return `De vraag is te lang (maximaal ${LIMITS.prompt} tekens).`;
	if (kind === 'sentence' && input.translation.trim() === '') return 'Een zin heeft een vertaling nodig.';
	if (input.translation.length > LIMITS.translation) return `De vertaling is te lang (maximaal ${LIMITS.translation} tekens).`;
	if (input.explanation.length > LIMITS.explanation) return `De uitleg is te lang (maximaal ${LIMITS.explanation} tekens).`;
	return null;
}
