// The signed-in user's own profile (photo, name, privacy, invite code), shared by the account menu, the profile page
// and the friends page. Stale-while-revalidate like overview: `data` stays until a reload replaces it.
import { getSocial } from '../social';
import type { MyProfile } from '../social/types';

class ProfileState {
	data = $state<MyProfile | null>(null);
	failed = $state(false);
	#running: Promise<void> | null = null;
	#generation = 0;

	load(): Promise<void> {
		this.#running ??= this.#fetch().finally(() => (this.#running = null));
		return this.#running;
	}

	async #fetch(): Promise<void> {
		const generation = this.#generation;
		try {
			const profile = await getSocial().getMyProfile();
			if (generation !== this.#generation) return;
			this.data = profile;
			this.failed = false;
		} catch {
			if (generation === this.#generation) this.failed = true;
		}
	}

	/** After saving: show the fresh profile at once. */
	set(profile: MyProfile): void {
		this.data = profile;
		this.failed = false;
	}

	/** After a login or logout. */
	reset(): void {
		this.#generation++;
		this.data = null;
		this.failed = false;
		this.#running = null;
	}
}

export const profile = new ProfileState();
