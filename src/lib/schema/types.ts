// Set/list/row types (PLAN §3). Pure TS: no Svelte, DOM or Supabase imports.
// Hand-written on purpose; zod.ts asserts at compile time that its schema matches these types.

export const SCHEMA_VERSION = 2 as const;

export const LEVELS = ['vmbo-b', 'vmbo-k', 'vmbo-gt', 'havo', 'vwo', 'gym'] as const;
export type Level = (typeof LEVELS)[number];

/** Templates the app can render. Unknown templates degrade to 'table' (see migrate.ts). */
export const LIST_TEMPLATES = ['table'] as const;
export type ListTemplate = (typeof LIST_TEMPLATES)[number];

/** List kinds. Unknown kinds degrade to 'custom' (see migrate.ts). */
export const LIST_KINDS = ['declension', 'conjugation', 'vocab', 'custom'] as const;
export type ListKind = (typeof LIST_KINDS)[number];

export type SetSettings = {
	strictAccents: boolean;
	strictMacrons: boolean;
	caseSensitive: boolean;
};

export const DEFAULT_SETTINGS: Readonly<SetSettings> = {
	strictAccents: true,
	strictMacrons: false,
	caseSensitive: false
};

export type StudyRow = {
	id: string;
	prompt: string;
	/** Every entry is an accepted variant. The first entry is the primary answer (used for hints). */
	answers: string[];
	/** Dimension name -> value, e.g. { number: 'sg', case: 'nom' }. Drives stages and filtering. */
	tags: Record<string, string>;
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