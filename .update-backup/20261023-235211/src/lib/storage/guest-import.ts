// Guest -> account import (PLAN §5): copies what a guest made on this device into the signed-in account.
// Safe to run again: sets are skipped when the account already has them, test results are upserts by id.
// Local data is only removed when it is confirmed to be in the account.
import { DEFAULT_USER_SETTINGS } from '../settings/settings';
import type { StorageAdapter } from './adapter';
import { clearGuestData, readGuestSnapshot, type GuestSnapshot } from './local';
import { isUuid } from './rows';

export type ImportReport = {
	/** Sets copied into the account. */
	imported: number;
	/** Sets the account already had (same id), so nothing was copied. */
	alreadyThere: number;
	/** Sets or results that could not be copied; they stay on this device. */
	failed: number;
	results: number;
	settings: boolean;
};

/** Is there anything worth offering to import? (Settings alone are not.) */
export function hasGuestData(snapshot: GuestSnapshot): boolean {
	return snapshot.sets.length > 0 || snapshot.results.length > 0;
}

export function readGuestData(): GuestSnapshot {
	return readGuestSnapshot();
}

export async function importGuestData(target: StorageAdapter, snapshot: GuestSnapshot): Promise<ImportReport> {
	const report: ImportReport = { imported: 0, alreadyThere: 0, failed: 0, results: 0, settings: false };
	const existing = new Set((await target.listSets()).map((s) => s.id));
	const done: string[] = [];

	for (const set of snapshot.sets) {
		if (!isUuid(set.id)) {
			report.failed++; // old non-UUID id: cannot be stored, stays on this device
			continue;
		}
		if (existing.has(set.id)) {
			report.alreadyThere++;
			done.push(set.id);
			continue;
		}
		try {
			await target.saveSet(set);
			const progress = snapshot.progress[set.id];
			if (progress && Object.keys(progress).length > 0) await target.saveProgress(set.id, progress);
			report.imported++;
			done.push(set.id);
		} catch {
			report.failed++;
		}
	}

	// Test results: upserts by id, so a repeat run does not duplicate them.
	let resultsFailed = 0;
	for (const record of snapshot.results) {
		try {
			await target.saveTestResult(record);
			report.results++;
		} catch {
			resultsFailed++;
		}
	}
	report.failed += resultsFailed;

	// Learn runs (for streak and stats): upserts by id as well.
	let sessionsFailed = 0;
	for (const log of snapshot.sessions) {
		try {
			await target.saveSession(log);
		} catch {
			sessionsFailed++;
		}
	}

	// Settings: only when the account still has the defaults, so account choices are never overwritten.
	if (snapshot.settings) {
		try {
			const account = await target.getSettings();
			if (JSON.stringify(account) === JSON.stringify(DEFAULT_USER_SETTINGS)) {
				await target.saveSettings(snapshot.settings);
				report.settings = true;
			}
		} catch {
			// not important enough to report
		}
	}

	clearGuestData({ setIds: done, results: resultsFailed === 0, sessions: sessionsFailed === 0, settings: report.settings });
	return report;
}
