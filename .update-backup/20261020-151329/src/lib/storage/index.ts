// The adapter the app uses. Guests get localStorage; a signed-in user gets Supabase (PLAN §5).
// `getStorage()` returns one stable object that forwards every call to the current backend, so components can keep
// `const storage = getStorage()` and still follow a login or logout. The root layout calls `useStorageFor`.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { StorageAdapter } from './adapter';
import { localStorageAdapter } from './local';
import { createSupabaseAdapter } from './supabase';

let backend: StorageAdapter = localStorageAdapter;
let backendUserId: string | null = null;

/** Browser only (module state would leak between requests on the server). Safe to call on every layout update. */
export function useStorageFor(client: SupabaseClient, userId: string | null): void {
	if (userId === backendUserId) return;
	backendUserId = userId;
	backend = userId ? createSupabaseAdapter(client, userId) : localStorageAdapter;
}

/** The signed-in user the storage currently belongs to, or null for a guest. */
export function storageUserId(): string | null {
	return backendUserId;
}

const current: StorageAdapter = {
	listSets: () => backend.listSets(),
	getSet: (id) => backend.getSet(id),
	saveSet: (set) => backend.saveSet(set),
	deleteSet: (id) => backend.deleteSet(id),
	getProgress: (setId) => backend.getProgress(setId),
	saveProgress: (setId, progress) => backend.saveProgress(setId, progress),
	getSettings: () => backend.getSettings(),
	saveSettings: (settings) => backend.saveSettings(settings),
	saveTestResult: (record) => backend.saveTestResult(record),
	listTestResults: (limit) => backend.listTestResults(limit)
};

export function getStorage(): StorageAdapter {
	return current;
}
