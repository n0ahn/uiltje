// Is the signed-in user the owner (listed in app_admins)? Asked once per sign-in; the answer only decides which links
// are shown. The real checks are in the database (row level security and owner-only functions).
import { createSuggestionsApi } from '../grammar/suggestions';
import { auth } from './auth.svelte';

class AdminState {
	isAdmin = $state(false);
	#checkedFor: string | null = null;

	/** Safe to call often: asks the database once per user. */
	async refresh(): Promise<void> {
		const user = auth.user;
		const client = auth.client;
		if (!user || !client) {
			this.isAdmin = false;
			this.#checkedFor = null;
			return;
		}
		if (this.#checkedFor === user.id) return;
		this.#checkedFor = user.id;
		this.isAdmin = await createSuggestionsApi(client).isAdmin();
	}
}

export const admin = new AdminState();
