// Set/list/row types (PLAN §3). Pure TS: no Svelte, DOM or Supabase imports.
// Hand-written on purpose; zod.ts asserts at compile time that its schema matches these types.

export const SCHEMA_VERSION = 4 as const;

export const LEVELS = ['vmbo-b', 'vmbo-k', 'vmbo-gt', 'havo', 'vwo', 'gym'] as const;
export type Level = (typeof LEVELS)[number];

/** Templates the app can render. Unknown templates degrade to 'table' (see migrate.ts). */
export const LIST_TEMPLATES = ['table'] as const;
export type ListTemplate = (typeof LIST_TEMPLATES)[number];

/** List kinds. Unknown kinds degrade to 'custom' (see migrate.ts). */
export const LIST_KINDS = ['declension', 'conjugation', 'vocab', 'concept', 'custom'] as const;
export type ListKind = (typeof LIST_KINDS)[number];

/**
 * Lists that are asked one item at a time (words and concepts) instead of in blocks of forms (rijtjes).
 * 'vocab': word -> translation. 'concept': explanation or example -> term (stijlfiguren, grammar rules).
 */
export function isWordKind(kind: ListKind): boolean {
	return kind === 'vocab' || kind === 'concept';
}

/** Keyboards a set can use for typing. 'greek' turns typed Latin letters into Greek ones (engine/greek.ts). */
export const KEYBOARDS = ['default', 'greek'] as const;
export type Keyboard = (typeof KEYBOARDS)[number];

export type SetSettings = {
	strictAccents: boolean;
	strictMacrons: boolean;
	caseSensitive: boolean;
	keyboard: Keyboard;
};

export const DEFAULT_SETTINGS: Readonly<SetSettings> = {
	strictAccents: true,
	strictMacrons: false,
	caseSensitive: false,
	keyboard: 'default'
};

export type StudyRow = {
	id: string;
	prompt: string;
	/** Every entry is an accepted variant. The first entry is the primary answer (used for hints). */
	answers: string[];
	/** Dimension name -> value, e.g. { number: 'sg', case: 'nom' }. Drives stages and filtering. */
	tags: Record<string, string>;
	/**
	 * Where the row came from, when it came from the grammar catalogue: `ltc-2027/anafora` (see lib/grammar) or
	 * `community/<id>` for a rule added by the community. Absent for rows typed in by hand.
	 */
	ref?: string;
	/** Optional explanation or mnemonic shown after a mistake (written by the user or by the AI). */
	tip?: string;
};

export type StudyList = {
	id: string;
	template: ListTemplate;
	kind: ListKind;
	title: string;
	group: string | null;
	columns: { prompt: string; answer: string };
	/** Order = default stage progression. */
	dimensions: string[];
	rows: StudyRow[];
};

// Named StudySet (not Set) to avoid clashing with the global Set.
export type StudySet = {
	schemaVersion: typeof SCHEMA_VERSION;
	id: string;
	title: string;
	subject: string;
	folder: string | null;
	settings: SetSettings;
	lists: StudyList[];
};