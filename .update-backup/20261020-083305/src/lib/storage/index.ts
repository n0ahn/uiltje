// The adapter the app uses. Guests only for now; phase 5 returns a Supabase adapter when someone is signed in.
import type { StorageAdapter } from './adapter';
import { localStorageAdapter } from './local';

export function getStorage(): StorageAdapter {
	return localStorageAdapter;
}