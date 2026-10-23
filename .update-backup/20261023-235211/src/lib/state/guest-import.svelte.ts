// State of the "import your guest data" prompt. Shown once per account on this device after a login,
// and again on demand from the settings page.
import { getStorage } from '../storage';
import { hasGuestData, importGuestData, readGuestData, type ImportReport } from '../storage/guest-import';
import type { GuestSnapshot } from '../storage/local';
import { toasts } from './toast.svelte';

const dismissedKey = (userId: string) => `uiltje:import-dismissed:${userId}`;

function wasDismissed(userId: string): boolean {
	try {
		return localStorage.getItem(dismissedKey(userId)) === '1';
	} catch {
		return false;
	}
}

class GuestImportState {
	open = $state(false);
	busy = $state(false);
	/** Counts of what is on this device (null until looked at). */
	found = $state<{ sets: number; results: number } | null>(null);
	#snapshot: GuestSnapshot | null = null;

	get hasData(): boolean {
		return !!this.found && (this.found.sets > 0 || this.found.results > 0);
	}

	/** Look at this device. `prompt`: open the dialog right away, unless dismissed before for this account. */
	check(userId: string, prompt: boolean): void {
		this.#snapshot = readGuestData();
		this.found = { sets: this.#snapshot.sets.length, results: this.#snapshot.results.length };
		if (prompt && hasGuestData(this.#snapshot) && !wasDismissed(userId)) this.open = true;
	}

	reset(): void {
		this.#snapshot = null;
		this.found = null;
		this.open = false;
	}

	dismiss(userId: string | null): void {
		this.open = false;
		if (!userId) return;
		try {
			localStorage.setItem(dismissedKey(userId), '1');
		} catch {
			// ignore
		}
	}

	async run(): Promise<void> {
		if (this.busy) return;
		// Read again: the guest may have changed something since the check.
		const snapshot = readGuestData();
		this.busy = true;
		try {
			const report = await importGuestData(getStorage(), snapshot);
			toasts.show(describe(report), 4500);
			this.check('', false);
			this.open = false;
		} catch {
			toasts.show('Importeren lukt niet. Controleer je internetverbinding en probeer het opnieuw.');
		} finally {
			this.busy = false;
		}
	}
}

function describe(r: ImportReport): string {
	const parts: string[] = [];
	const total = r.imported + r.alreadyThere;
	if (total > 0) parts.push(total === 1 ? '1 set overgezet' : `${total} sets overgezet`);
	if (r.results > 0) parts.push(r.results === 1 ? '1 toetsresultaat' : `${r.results} toetsresultaten`);
	let text = parts.length > 0 ? parts.join(' en ') : 'Niets om over te zetten';
	if (r.failed > 0) text += `. ${r.failed} ${r.failed === 1 ? 'onderdeel' : 'onderdelen'} lukte niet en staat nog op dit apparaat`;
	return text;
}

export const guestImport = new GuestImportState();
