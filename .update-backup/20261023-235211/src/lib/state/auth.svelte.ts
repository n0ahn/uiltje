// Who is signed in, plus the one place that signs out. The root layout keeps `client` and `user` current.
import { goto } from '$app/navigation';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { toasts } from './toast.svelte';

class AuthState {
	client = $state<SupabaseClient | null>(null);
	user = $state<User | null>(null);
	signingOut = $state(false);

	async signOut(): Promise<void> {
		if (!this.client || this.signingOut) return;
		this.signingOut = true;
		try {
			const { error } = await this.client.auth.signOut();
			if (error) {
				toasts.show('Uitloggen is mislukt, probeer het opnieuw');
				return;
			}
			await goto('/', { invalidateAll: true });
			toasts.show('Je bent uitgelogd');
		} finally {
			this.signingOut = false;
		}
	}
}

export const auth = new AuthState();
