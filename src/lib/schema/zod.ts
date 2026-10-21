// Strict zod schema for sets (PLAN §3). Deliberately free of transforms/defaults so it can be
// turned into JSON Schema for Gemini later. Leniency (defaults, unknown template/kind) lives in migrate.ts.
import { z } from 'zod';
import { KEYBOARDS, LIST_KINDS, LIST_TEMPLATES, SCHEMA_VERSION } from './types';
import type { SetSettings, StudyList, StudyRow, StudySet } from './types';

const id = z.string().min(1);

export const SetSettingsSchema = z.object({
	strictAccents: z.boolean(),
	strictMacrons: z.boolean(),
	caseSensitive: z.boolean(),
	keyboard: z.enum(KEYBOARDS)
});

export const StudyRowSchema = z.object({
	id,
	prompt: z.string().min(1),
	answers: z.array(z.string().min(1)).min(1),
	tags: z.record(z.string(), z.string())
});

export const StudyListSchema = z.object({
	id,
	template: z.enum(LIST_TEMPLATES),
	kind: z.enum(LIST_KINDS),
	title: z.string().min(1),
	group: z.string().nullable(),
	columns: z.object({ prompt: z.string().min(1), answer: z.string().min(1) }),
	dimensions: z.array(z.string().min(1)),
	rows: z.array(StudyRowSchema)
});

function hasUniqueIds(set: { lists: { id: string; rows: { id: string }[] }[] }): boolean {
	const listIds = new Set(set.lists.map((l) => l.id));
	if (listIds.size !== set.lists.length) return false;
	return set.lists.every((l) => new Set(l.rows.map((r) => r.id)).size === l.rows.length);
}

export const StudySetSchema = z
	.object({
		schemaVersion: z.literal(SCHEMA_VERSION),
		id,
		title: z.string().min(1),
		subject: z.string().min(1),
		folder: z.string().nullable(),
		settings: SetSettingsSchema,
		lists: z.array(StudyListSchema)
	})
	.refine(hasUniqueIds, { message: 'List ids and row ids (per list) must be unique' });

// Compile-time guard: schema output and hand-written types must be mutually assignable.
type Mutual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
export type SchemaMatchesTypes = [
	Mutual<z.infer<typeof SetSettingsSchema>, SetSettings> extends true ? true : never,
	Mutual<z.infer<typeof StudyRowSchema>, StudyRow> extends true ? true : never,
	Mutual<z.infer<typeof StudyListSchema>, StudyList> extends true ? true : never,
	Mutual<z.infer<typeof StudySetSchema>, StudySet> extends true ? true : never
];