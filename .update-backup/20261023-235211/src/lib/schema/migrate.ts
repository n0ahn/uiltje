// Entry point for turning untrusted JSON (import, DB read, AI output) into a StudySet (RULES: validate at every boundary).
// Steps: version check -> migrations -> lenient normalization (defaults, unknown template/kind degrade) -> strict zod parse.
import { DEFAULT_SETTINGS, KEYBOARDS, LIST_KINDS, LIST_TEMPLATES, SCHEMA_VERSION } from './types';
import type { StudySet } from './types';
import { StudySetSchema } from './zod';

type Json = Record<string, unknown>;

export type ParseResult = { ok: true; set: StudySet } | { ok: false; issues: string[] };

function isRecord(value: unknown): value is Json {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** migrations[v] upgrades a set from schema version v to v + 1. Add an entry whenever SCHEMA_VERSION is bumped. */
const migrations: Record<number, (data: Json) => Json> = {
	// v1 -> v2: the level moved from the set to the account settings.
	1: (data) => {
		const { level: _level, ...rest } = data;
		return rest;
	},
	// v2 -> v3: sets got a keyboard setting ('default'; filled in by normalizeSet).
	2: (data) => data,
	// v3 -> v4: lists of kind 'concept' and the optional row `ref` (both are additions, nothing to rewrite).
	3: (data) => data
};

function normalizeRow(raw: unknown): unknown {
	if (!isRecord(raw)) return raw;
	return {
		...raw,
		answers: typeof raw.answers === 'string' ? [raw.answers] : raw.answers,
		tags: raw.tags ?? {}
	};
}

function normalizeList(raw: unknown): unknown {
	if (!isRecord(raw)) return raw;
	const template = (LIST_TEMPLATES as readonly unknown[]).includes(raw.template) ? raw.template : 'table';
	const kind = (LIST_KINDS as readonly unknown[]).includes(raw.kind) ? raw.kind : 'custom';
	return {
		...raw,
		template,
		kind,
		group: raw.group ?? null,
		columns: raw.columns ?? { prompt: 'Vorm', answer: 'Woord' },
		dimensions: raw.dimensions ?? [],
		rows: Array.isArray(raw.rows) ? raw.rows.map(normalizeRow) : raw.rows
	};
}

function normalizeSet(data: Json): Json {
	const given = isRecord(data.settings) ? data.settings : {};
	const settings: Json = { ...DEFAULT_SETTINGS };
	for (const key of Object.keys(DEFAULT_SETTINGS)) {
		if (typeof DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS] === 'boolean' && typeof given[key] === 'boolean') settings[key] = given[key];
	}
	if ((KEYBOARDS as readonly unknown[]).includes(given.keyboard)) settings.keyboard = given.keyboard;
	return {
		...data,
		folder: data.folder ?? null,
		settings,
		lists: Array.isArray(data.lists) ? data.lists.map(normalizeList) : data.lists
	};
}

function fail(...issues: string[]): ParseResult {
	return { ok: false, issues };
}

export function parseStudySet(raw: unknown): ParseResult {
	if (!isRecord(raw)) return fail('Set must be a JSON object');

	let version: number = SCHEMA_VERSION; // a missing version is assumed current (e.g. AI output)
	if (raw.schemaVersion !== undefined) {
		if (typeof raw.schemaVersion !== 'number' || !Number.isInteger(raw.schemaVersion) || raw.schemaVersion < 1) {
			return fail('schemaVersion must be a positive integer');
		}
		version = raw.schemaVersion;
	}
	if (version > SCHEMA_VERSION) return fail(`Set uses schema version ${version}, newer than supported (${SCHEMA_VERSION})`);

	let data: Json = { ...raw, schemaVersion: version };
	for (let v = version; v < SCHEMA_VERSION; v++) {
		const step = migrations[v];
		if (!step) return fail(`No migration from schema version ${v}`);
		data = { ...step(data), schemaVersion: v + 1 };
	}

	const parsed = StudySetSchema.safeParse(normalizeSet(data));
	if (parsed.success) return { ok: true, set: parsed.data };
	return fail(
		...parsed.error.issues.map((issue) => {
			const path = issue.path.map(String).join('.');
			return path ? `${path}: ${issue.message}` : issue.message;
		})
	);
}