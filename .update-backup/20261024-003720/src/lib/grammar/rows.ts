// Turns grammar catalogue items (and hand-typed or community items) into rows of a 'concept' list:
// the prompt is an explanation or an example, the answer is the term. Pure TS.
// Everything here is deterministic: no AI, so these rows are correct by construction (they are the syllabus text).
import type { GrammarExample, GrammarItem } from './types';

export type ConceptRow = { prompt: string; answers: string[]; ref?: string };

/**
 * What the learner may type for a term, and how the answer is shown (answers are shown joined by ", ").
 * "γνώμη / sententia" gives ["γνώμη", "sententia"]; text in parentheses is left out: "prospectie (flashforward)" gives ["prospectie"].
 */
export function answerVariants(term: string): string[] {
	const parts = term
		.split(/\s*\/\s*/u)
		.map((part) => part.replace(/\([^)]*\)/gu, '').replace(/\s+/gu, ' ').trim())
		.filter(Boolean);
	return [...new Set(parts.length > 0 ? parts : [term.trim()])];
}

/** Words to hide in the question: the answers, and what the term itself puts between parentheses. */
function hiddenWords(term: string): string[] {
	const inParentheses = [...term.matchAll(/\(([^)]*)\)/gu)].map((m) => m[1]!.trim());
	return [...answerVariants(term), ...inParentheses].filter(Boolean);
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

/** Replaces the term (and its variants) in the explanation by "…", so the question does not give the answer away. */
export function maskTerm(text: string, term: string): string {
	// Longest first, so "oratio invectiva" is masked as a whole before "oratio".
	const words = hiddenWords(term).sort((a, b) => b.length - a.length);
	let masked = text;
	for (const word of words) {
		if (word.length < 3) continue;
		masked = masked.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(word)}(?![\\p{L}\\p{N}])`, 'giu'), '…');
	}
	return masked;
}

/** The "parts" of an item (e.g. the four kinds of metonymia) are added to the explanation when the list is short. */
const MAX_PARTS_IN_PROMPT = 8;

export function describe(item: Pick<GrammarItem, 'summary' | 'parts'>): string {
	const parts = item.parts ?? [];
	if (parts.length === 0 || parts.length > MAX_PARTS_IN_PROMPT) return item.summary;
	return `${item.summary} Onderdelen: ${parts.join('; ')}.`;
}

export function exampleRow(example: Pick<GrammarExample, 'text' | 'nl'>): string {
	return `${example.text} — ${example.nl}`;
}

export type ConceptItem = Pick<GrammarItem, 'term' | 'summary' | 'parts' | 'examples'>;

/** One explanation row, plus one row per example when `withExamples`. `ref` ties the rows to their catalogue item. */
export function conceptRows(item: ConceptItem, options: { ref?: string; withExamples: boolean }): ConceptRow[] {
	const answers = answerVariants(item.term);
	const base = options.ref ? { ref: options.ref } : {};
	const rows: ConceptRow[] = [{ prompt: maskTerm(describe(item), item.term), answers, ...base }];
	if (options.withExamples) {
		for (const example of item.examples ?? []) rows.push({ prompt: maskTerm(exampleRow(example), item.term), answers, ...base });
	}
	return rows;
}

/** A hand-typed item: term + explanation, optionally one example with its translation. */
export type CustomItem = { term: string; definition: string; example?: string; exampleTranslation?: string };

export function customItemRows(item: CustomItem, ref?: string): ConceptRow[] {
	const toItem: ConceptItem = {
		term: item.term.trim(),
		summary: item.definition.trim(),
		...(item.example?.trim()
			? { examples: [{ text: item.example.trim(), nl: item.exampleTranslation?.trim() ?? '', ref: '' }] }
			: {})
	};
	const rows = conceptRows(toItem, { ...(ref ? { ref } : {}), withExamples: true });
	// A hand-typed example without translation has no " — ".
	return rows.map((row) => ({ ...row, prompt: row.prompt.replace(/\s+—\s*$/u, '') }));
}
