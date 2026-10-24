// "What's new" prompt: shown once per device, the first time the site is opened after an update (see changelog.ts).
import { CHANGELOG, type Update } from '../changelog';

const KEY = 'uiltje:last-seen-update';
const latestId = CHANGELOG[0]?.id ?? null;

function read(): string | null {
	try {
		return localStorage.getItem(KEY);
	} catch {
		return null;
	}
}

/** True when this browser has stored anything of ours before, i.e. it is not a first-time visitor. */
function isReturning(): boolean {
	try {
		return Object.keys(localStorage).some((k) => k.startsWith('uiltje:') && k !== KEY);
	} catch {
		return false;
	}
}

class UpdatesState {
	open = $state(false);
	entries = $state<Update[]>([]);
	#checked = false;

	/** Decide once per page load whether there is something new to show. */
	check(): void {
		if (this.#checked || !latestId) return;
		this.#checked = true;
		const seen = read();
		if (seen === latestId) return;
		// A brand-new visitor has nothing to catch up on: just remember the current version.
		if (seen === null && !isReturning()) return this.dismiss();
		const index = CHANGELOG.findIndex((u) => u.id === seen);
		// Everything newer than what was last seen (max 3); an unknown or missing marker shows the newest entry.
		this.entries = index === -1 ? CHANGELOG.slice(0, 1) : CHANGELOG.slice(0, Math.min(index, 3));
		this.open = this.entries.length > 0;
	}

	dismiss(): void {
		this.open = false;
		if (!latestId) return;
		try {
			localStorage.setItem(KEY, latestId);
		} catch {
			// ignore
		}
	}
}

export const updates = new UpdatesState();
