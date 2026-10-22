// Verified grammar catalogue (phase 9). Pure TS: no Svelte, DOM or Supabase imports.
// This is the fixed base that generated questions are built on: the AI may write sentences and questions around
// these items, but never invents the terms or their definitions (NOTES "Phase 9 correctness strategy").

export const SECTION_KINDS = ['vormleer', 'syntaxis', 'stilistisch', 'narratologisch', 'argumentatief', 'poezie', 'retorica', 'context', 'stamtijden', 'ionisch', 'auteur'] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];

export type GrammarExample = {
	/** Latin or Greek text, as quoted in the syllabus (classical authors, public domain). */
	text: string;
	/** Own Dutch translation (not copied from the syllabus). */
	nl: string;
	/** Author and place, e.g. "Vergilius, Aeneis 1.55". */
	ref: string;
};

export type GrammarItem = {
	/** Stable id, never reused: generated questions point at it. */
	id: string;
	/** The term the student must know, in the spelling of the syllabus. */
	term: string;
	/** Short Dutch explanation, own wording. */
	summary: string;
	examples?: GrammarExample[];
	/** Dutch/Latin names of the parts or the forms to know (for lists like "metonymia" and "taken van de redenaar"). */
	parts?: string[];
	/** Not on the 2027 central exam list for every year: tied to the exam topic of that year (Cicero in 2027). */
	examYear?: number;
	/** Syllabus says explicitly this is NOT assumed known. */
	notRequired?: boolean;
	/** A syllabus topic without a definition of its own ("het gebruik van de naamvallen bij voorzetsels"): no good question, so the picker does not offer it. */
	topic?: boolean;
};

export type GrammarSection = {
	id: string;
	kind: SectionKind;
	title: string;
	/** Where in the syllabus, e.g. "Bijlage 3, deel III.I". */
	source: string;
	items: GrammarItem[];
};

export type PrincipalParts = {
	/** Present form, e.g. "accipio" (for deponents the first person present). */
	verb: string;
	/** The remaining forms in order: perfect, supine/ppp. "-" means none. */
	forms: string[];
	deponent: boolean;
	/** The syllabus marks these forms with an asterisk: included for completeness, not assumed known. */
	notRequired: boolean;
};

/** One syllabus-year of grammar for one subject. Question items point at `${catalogue.id}/${item.id}`. */
export type GrammarCatalogue = {
	id: 'ltc-2027' | 'gtc-2027';
	/** Subject name as used in sets. */
	subject: 'Latijn' | 'Grieks';
	examYear: number;
	source: { title: string; publisher: string; url: string };
	sections: readonly GrammarSection[];
};
