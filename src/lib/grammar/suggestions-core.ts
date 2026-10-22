// Suggestions for grammar rules that should become standard in the app (phase 9). Pure TS: validation and row parsing.
// The database side is ai/sql/004_grammar_suggestions.sql; the calls are in suggestions.ts.
import { z } from 'zod';

export const SUGGESTION_SUBJECTS = ['Latijn', 'Grieks', 'Anders'] as const;
export type SuggestionSubject = (typeof SUGGESTION_SUBJECTS)[number];

export const SUGGESTION_STATUSES = ['new', 'accepted', 'rejected'] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

/** Limits match the check constraints in the SQL file. */
export const LIMITS = { term: 80, definition: 800, example: 400, exampleTranslation: 400, source: 200 } as const;

export type SuggestionInput = {
	subject: SuggestionSubject;
	term: string;
	definition: string;
	example: string;
	exampleTranslation: string;
	source: string;
};

export const emptySuggestion = (subject: SuggestionSubject = 'Latijn'): SuggestionInput => ({ subject, term: '', definition: '', example: '', exampleTranslation: '', source: '' });

/** A Dutch error message, or null when the suggestion can be sent. */
export function validateSuggestion(input: SuggestionInput): string | null {
	const term = input.term.trim();
	const definition = input.definition.trim();
	if (term === '') return 'Vul de naam van de regel of het begrip in.';
	if (term.length > LIMITS.term) return `De naam is te lang (maximaal ${LIMITS.term} tekens).`;
	if (definition === '') return 'Leg kort uit wat het is, zodat er een vraag van gemaakt kan worden.';
	if (definition.length < 10) return 'De uitleg is nog erg kort. Schrijf minstens een zin.';
	if (definition.length > LIMITS.definition) return `De uitleg is te lang (maximaal ${LIMITS.definition} tekens).`;
	if (input.example.trim().length > LIMITS.example) return `Het voorbeeld is te lang (maximaal ${LIMITS.example} tekens).`;
	if (input.exampleTranslation.trim().length > LIMITS.exampleTranslation) return `De vertaling is te lang (maximaal ${LIMITS.exampleTranslation} tekens).`;
	if (input.exampleTranslation.trim() !== '' && input.example.trim() === '') return 'Je hebt een vertaling ingevuld maar geen voorbeeld.';
	if (input.source.trim().length > LIMITS.source) return `De bron is te lang (maximaal ${LIMITS.source} tekens).`;
	return null;
}

const text = z.string();
const optionalText = z.string().nullable().transform((value) => value ?? '');

/** An accepted rule as every user gets it (from the `list_community_items` function; no author). */
export const CommunityItemSchema = z.object({
	id: z.string().min(1),
	subject: z.enum(SUGGESTION_SUBJECTS),
	term: text.min(1),
	definition: text.min(1),
	example: optionalText,
	example_translation: optionalText
});
export type CommunityItem = { id: string; subject: SuggestionSubject; term: string; definition: string; example: string; exampleTranslation: string };

export const SuggestionRowSchema = z.object({
	id: z.string().min(1),
	subject: z.enum(SUGGESTION_SUBJECTS),
	term: text.min(1),
	definition: text.min(1),
	example: optionalText,
	example_translation: optionalText,
	source: optionalText,
	status: z.enum(SUGGESTION_STATUSES),
	created_at: z.string()
});
export type Suggestion = {
	id: string;
	subject: SuggestionSubject;
	term: string;
	definition: string;
	example: string;
	exampleTranslation: string;
	source: string;
	status: SuggestionStatus;
	createdAt: number;
};

export function toCommunityItem(row: z.infer<typeof CommunityItemSchema>): CommunityItem {
	return { id: row.id, subject: row.subject, term: row.term, definition: row.definition, example: row.example, exampleTranslation: row.example_translation };
}

export function toSuggestion(row: z.infer<typeof SuggestionRowSchema>): Suggestion {
	return {
		id: row.id,
		subject: row.subject,
		term: row.term,
		definition: row.definition,
		example: row.example,
		exampleTranslation: row.example_translation,
		source: row.source,
		status: row.status,
		createdAt: Date.parse(row.created_at) || 0
	};
}

/** Parses a list of untrusted rows; rows that do not fit are dropped (one bad row must not hide the others). */
export function parseList<T extends z.ZodTypeAny>(schema: T, rows: unknown): z.infer<T>[] {
	if (!Array.isArray(rows)) return [];
	return rows.flatMap((row) => {
		const parsed = schema.safeParse(row);
		return parsed.success ? [parsed.data] : [];
	});
}
