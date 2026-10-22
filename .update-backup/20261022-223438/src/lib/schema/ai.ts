// What the AI import asks Gemini for, and how that becomes a StudySet. Pure TS (no Svelte/DOM/Supabase).
// Gemini never invents ids and never sees the full StudySet schema: it returns this simpler shape, and
// `aiToStudySet` adds ids, defaults and settings, then runs the result through parseStudySet (RULES: validate at every boundary).
import { z } from 'zod';
import { parseStudySet } from './migrate';
import { LIST_KINDS } from './types';
import type { StudySet } from './types';

const str = z.string().default('');

export const AiRowSchema = z.object({
	prompt: str,
	answers: z.array(z.string()).default([]),
	tags: z.array(z.object({ name: z.string(), value: z.string() })).default([])
});

export const AiListSchema = z.object({
	title: str,
	kind: z.enum(LIST_KINDS).catch('custom'),
	group: str,
	promptColumn: str,
	answerColumn: str,
	dimensions: z.array(z.string()).default([]),
	rows: z.array(AiRowSchema).default([])
});

export const AiOutputSchema = z.object({
	title: str,
	subject: str,
	lists: z.array(AiListSchema).default([]),
	/** Short Dutch remarks for the user: unreadable parts, guesses, skipped content. */
	notes: z.array(z.string()).default([])
});
export type AiOutput = z.infer<typeof AiOutputSchema>;

/** Hand-written JSON Schema for Gemini's `responseJsonSchema` (kept to the common subset on purpose). */
export const AI_RESPONSE_JSON_SCHEMA = {
	type: 'object',
	properties: {
		title: { type: 'string', description: 'Short Dutch title for the whole set.' },
		subject: { type: 'string', description: 'Subject, e.g. Latijn, Grieks, Nederlands, Engels, Frans, Duits.' },
		lists: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					title: { type: 'string' },
					kind: { type: 'string', enum: [...LIST_KINDS] },
					group: { type: 'string', description: 'Chapter/group name, or empty string.' },
					promptColumn: { type: 'string', description: 'Dutch name of the question column, e.g. "Vorm" or "Woord".' },
					answerColumn: { type: 'string', description: 'Dutch name of the answer column, e.g. "Woord" or "Vertaling".' },
					dimensions: { type: 'array', items: { type: 'string' } },
					rows: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								prompt: { type: 'string' },
								answers: { type: 'array', items: { type: 'string' } },
								tags: {
									type: 'array',
									items: {
										type: 'object',
										properties: { name: { type: 'string' }, value: { type: 'string' } },
										required: ['name', 'value']
									}
								}
							},
							required: ['prompt', 'answers', 'tags']
						}
					}
				},
				required: ['title', 'kind', 'group', 'promptColumn', 'answerColumn', 'dimensions', 'rows']
			}
		},
		notes: { type: 'array', items: { type: 'string' } }
	},
	required: ['title', 'subject', 'lists', 'notes']
} as const;

const SUBJECT_ALIASES: [RegExp, string][] = [
	[/^(latijn|latin)$/i, 'Latijn'],
	[/^(grieks|greek)$/i, 'Grieks'],
	[/^(nederlands|dutch)$/i, 'Nederlands'],
	[/^(engels|english)$/i, 'Engels'],
	[/^(frans|french)$/i, 'Frans'],
	[/^(duits|german)$/i, 'Duits']
];

/** Maps "latin"/"Latijn " to the app's own subject names; unknown subjects stay as written. */
export function normalizeSubject(subject: string): string {
	const clean = subject.trim();
	return SUBJECT_ALIASES.find(([pattern]) => pattern.test(clean))?.[1] ?? clean;
}

const DEFAULT_COLUMNS: Record<(typeof LIST_KINDS)[number], { prompt: string; answer: string }> = {
	declension: { prompt: 'Vorm', answer: 'Woord' },
	conjugation: { prompt: 'Persoon', answer: 'Vorm' },
	vocab: { prompt: 'Woord', answer: 'Vertaling' },
	custom: { prompt: 'Vorm', answer: 'Woord' }
};

export type AiConversion = { ok: true; set: StudySet; notes: string[] } | { ok: false; issues: string[] };

/** AI output (unknown JSON) -> a valid StudySet plus the AI's own remarks and what was dropped. */
export function aiToStudySet(raw: unknown, options: { newId: () => string; subject?: string }): AiConversion {
	const parsed = AiOutputSchema.safeParse(raw);
	if (!parsed.success) return { ok: false, issues: ['De AI gaf een antwoord in een onverwacht formaat.'] };
	const ai = parsed.data;
	const notes = ai.notes.map((n) => n.trim()).filter(Boolean);

	const subject = normalizeSubject(options.subject?.trim() || ai.subject) || 'Overig';
	let dropped = 0;

	const lists = ai.lists
		.map((list, index) => {
			const rows = list.rows
				.map((row) => {
					const prompt = row.prompt.trim();
					const answers = [...new Set(row.answers.map((a) => a.trim()).filter(Boolean))];
					const tags: Record<string, string> = {};
					for (const { name, value } of row.tags) if (name.trim() && value.trim()) tags[name.trim()] = value.trim();
					return { id: options.newId(), prompt, answers, tags: list.kind === 'vocab' ? {} : tags };
				})
				.filter((row) => {
					const keep = row.prompt !== '' && row.answers.length > 0;
					if (!keep) dropped++;
					return keep;
				});
			const used = new Set(rows.flatMap((r) => Object.keys(r.tags)));
			const dimensions =
				list.kind === 'vocab' ? [] : [...new Set([...list.dimensions.map((d) => d.trim()).filter((d) => used.has(d)), ...used])];
			const defaults = DEFAULT_COLUMNS[list.kind];
			return {
				id: options.newId(),
				template: 'table',
				kind: list.kind,
				title: list.title.trim() || `Lijst ${index + 1}`,
				group: list.group.trim() || null,
				columns: { prompt: list.promptColumn.trim() || defaults.prompt, answer: list.answerColumn.trim() || defaults.answer },
				dimensions,
				rows
			};
		})
		.filter((list) => list.rows.length > 0);

	if (lists.length === 0) return { ok: false, issues: ['Er zijn geen rijen gevonden. Probeer een scherpere foto of plak de tekst.'] };
	if (dropped > 0) notes.push(`${dropped} ${dropped === 1 ? 'rij' : 'rijen'} zonder vraag of antwoord weggelaten.`);

	const result = parseStudySet({
		id: options.newId(),
		title: ai.title.trim() || lists[0]!.title,
		subject,
		folder: null,
		settings: { keyboard: normalizeSubject(subject) === 'Grieks' ? 'greek' : 'default' },
		lists
	});
	return result.ok ? { ok: true, set: result.set, notes } : { ok: false, issues: result.issues };
}
