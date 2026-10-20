// Settings state (runes). Loaded once from the storage adapter; components read `settings.value` and change it
// with `settings.update(draft => { ... })`, which saves right away. Theme has its own state (state/theme.svelte.ts).
import { DEFAULT_USER_SETTINGS, type UserSettings } from '../settings/settings';
import { getStorage } from '../storage';
import { StorageError } from '../storage/adapter';
import { toasts } from './toast.svelte';

class SettingsState {
	value = $state<UserSettings>(structuredClone(DEFAULT_USER_SETTINGS));
	loaded = $state(false);
	#loading: Promise<void> | null = null;

	/** Browser only. Safe to call from several places: the settings are read once. */
	load(): Promise<void> {
		this.#loading ??= getStorage()
			.getSettings()
			.then((settings) => {
				this.value = settings;
			})
			.catch(() => {
				// unreadable storage: keep the defaults
			})
			.finally(() => {
				this.loaded = true;
			});
		return this.#loading;
	}

	async update(change: (draft: UserSettings) => void): Promise<void> {
		const next = structuredClone($state.snapshot(this.value)) as UserSettings;
		change(next);
		this.value = next;
		try {
			await getStorage().saveSettings(next);
		} catch (error) {
			toasts.show(error instanceof StorageError ? error.message : 'Instellingen opslaan is mislukt');
		}
	}
}

export const settings = new SettingsState();
