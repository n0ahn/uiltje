// The user's overview (subjects, recent sets, streak): shared by the dashboard and the command palette.
// Stale-while-revalidate: `data` keeps the last result so a page can show it at once while `load()` refreshes it.
import { buildDashboard, type DashboardData } from '../dashboard/data';
import { loadStats } from '../stats/library';
import { getStorage } from '../storage';

class OverviewState {
	data = $state<DashboardData | null>(null);
	failed = $state(false);
	#loadedAt = 0;
	#running: Promise<void> | null = null;
	/** Bumped by reset(), so a load that started before a login or logout is thrown away. */
	#generation = 0;

	/** Browser only. `maxAgeMs`: skip the reload when the data is that fresh. */
	load(maxAgeMs = 0): Promise<void> {
		if (this.data && Date.now() - this.#loadedAt < maxAgeMs) return Promise.resolve();
		this.#running ??= this.#fetch().finally(() => (this.#running = null));
		return this.#running;
	}

	async #fetch(): Promise<void> {
		const generation = this.#generation;
		try {
			const now = Date.now();
			const data = buildDashboard(await loadStats(getStorage(), now), now);
			if (generation !== this.#generation) return;
			this.data = data;
			this.failed = false;
			this.#loadedAt = now;
		} catch {
			if (generation === this.#generation) this.failed = true;
		}
	}

	/** After a login or logout: the data belongs to someone else. */
	reset(): void {
		this.#generation++;
		this.data = null;
		this.failed = false;
		this.#loadedAt = 0;
		this.#running = null;
	}
}

export const overview = new OverviewState();
