// Guest storage in localStorage. One key per set, so a corrupt entry only hides that one set.
// Reads are validated with parseStudySet (RULES: validate at every boundary).
import { parseStudySet } from '../schema/migrate';
import { parseUserSettings, type UserSettings } from '../settings/settings';
import type { StudySet } from '../schema/types';
import { StorageError, type ProgressMap, type SetSummary, type StorageAdapter, type TestRecord } from './adapter';

const SET_PREFIX = 'uiltje:set:';
const PROGRESS_PREFIX = 'uiltje:progress:';
const SETTINGS_KEY = 'uiltje:settings';
const RESULTS_KEY = 'uiltje:results';
/** Oldest test results are dropped beyond this, so the browser quota (~5 MB) is never the problem. */
const MAX_RESULTS = 50;

type Envelope = { updatedAt: number; set: unknown };

function read(key: string): unknown {
	try {
		const raw = localStorage.getItem(key);
		return raw === null ? null : JSON.parse(raw);
	} catch {
		return null;
	}
}

function write(key: string, value: unknown): void {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		throw new StorageError('Opslaan lukt niet: de opslag van je browser is vol of uitgeschakeld.');
	}
}

function isRecord(value: unknown): value is TestRecord {
	if (!value || typeof value !== 'object') return false;
	const r = value as Record<string, unknown>;
	return (
		typeof r.id === 'string' &&
		typeof r.takenAt === 'number' &&
		typeof r.title === 'string' &&
		Array.isArray(r.setIds) &&
		typeof r.total === 'number' &&
		typeof r.correct === 'number' &&
		typeof r.score === 'number' &&
		typeof r.grade === 'number' &&
		Array.isArray(r.wrong)
	);
}

function readResults(): TestRecord[] {
	const data = read(RESULTS_KEY);
	return Array.isArray(data) ? data.filter(isRecord) : [];
}

function setKeys(): string[] {
	const keys: string[] = [];
	try {
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key?.startsWith(SET_PREFIX)) keys.push(key);
		}
	} catch {
		// storage unavailable: no sets
	}
	return keys;
}

function load(key: string): { set: StudySet; updatedAt: number } | null {
	const data = read(key) as Envelope | null;
	if (!data || typeof data !== 'object') return null;
	const result = parseStudySet(data.set);
	if (!result.ok) return null;
	return { set: result.set, updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0 };
}

export const localStorageAdapter: StorageAdapter = {
	async listSets() {
		const out: SetSummary[] = [];
		for (const key of setKeys()) {
			const entry = load(key);
			if (!entry) continue;
			const { set, updatedAt } = entry;
			out.push({
				id: set.id,
				title: set.title,
				subject: set.subject,
				folder: set.folder,
				listCount: set.lists.length,
				rowCount: set.lists.reduce((sum, list) => sum + list.rows.length, 0),
				updatedAt
			});
		}
		return out.sort((a, b) => b.updatedAt - a.updatedAt);
	},

	async getSet(id) {
		return load(SET_PREFIX + id)?.set ?? null;
	},

	async saveSet(set) {
		const envelope: Envelope = { updatedAt: Date.now(), set };
		write(SET_PREFIX + set.id, envelope);
	},

	async deleteSet(id) {
		try {
			localStorage.removeItem(SET_PREFIX + id);
			localStorage.removeItem(PROGRESS_PREFIX + id);
			// Results of a test on only this set go with it; results over several sets stay.
			const left = readResults().filter((r) => !(r.setIds.length === 1 && r.setIds[0] === id));
			localStorage.setItem(RESULTS_KEY, JSON.stringify(left));
		} catch {
			throw new StorageError('Verwijderen lukt niet: de opslag van je browser is uitgeschakeld.');
		}
	},

	async getProgress(setId) {
		const data = read(PROGRESS_PREFIX + setId);
		return data && typeof data === 'object' ? (data as ProgressMap) : {};
	},

	async saveProgress(setId, progress) {
		write(PROGRESS_PREFIX + setId, progress);
	},

	async getSettings() {
		return parseUserSettings(read(SETTINGS_KEY));
	},

	async saveSettings(settings) {
		write(SETTINGS_KEY, settings);
	},

	async saveTestResult(record) {
		const all = [record, ...readResults().filter((r) => r.id !== record.id)].sort((a, b) => b.takenAt - a.takenAt);
		write(RESULTS_KEY, all.slice(0, MAX_RESULTS));
	},

	async listTestResults(limit = MAX_RESULTS) {
		return readResults()
			.sort((a, b) => b.takenAt - a.takenAt)
			.slice(0, limit);
	}
};

/** Everything a guest has stored on this device (used for the guest -> account import). */
export type GuestSnapshot = {
	sets: StudySet[];
	/** Progress per set id. */
	progress: Record<string, ProgressMap>;
	/** null when the guest never changed a setting. */
	settings: UserSettings | null;
	results: TestRecord[];
};

export function readGuestSnapshot(): GuestSnapshot {
	const sets: StudySet[] = [];
	const progress: Record<string, ProgressMap> = {};
	for (const key of setKeys()) {
		const entry = load(key);
		if (!entry) continue;
		sets.push(entry.set);
		const saved = read(PROGRESS_PREFIX + entry.set.id);
		if (saved && typeof saved === 'object') progress[entry.set.id] = saved as ProgressMap;
	}
	const rawSettings = read(SETTINGS_KEY);
	return { sets, progress, settings: rawSettings === null ? null : parseUserSettings(rawSettings), results: readResults() };
}

/** Removes data that is safely in the account now. Drafts and the theme choice stay. */
export function clearGuestData(what: { setIds: readonly string[]; results: boolean; settings: boolean }): void {
	try {
		for (const id of what.setIds) {
			localStorage.removeItem(SET_PREFIX + id);
			localStorage.removeItem(PROGRESS_PREFIX + id);
		}
		if (what.results) localStorage.removeItem(RESULTS_KEY);
		if (what.settings) localStorage.removeItem(SETTINGS_KEY);
	} catch {
		// storage unavailable: nothing to clear
	}
}
