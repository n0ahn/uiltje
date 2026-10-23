<script lang="ts">
	import type { User } from '@supabase/supabase-js';
	import { goto } from '$app/navigation';
	import { getSocial } from '../../social/index.js';
	import { auth } from '../../state/auth.svelte.js';
	import { guestImport } from '../../state/guest-import.svelte.js';
	import { profile } from '../../state/profile.svelte.js';
	import { toasts } from '../../state/toast.svelte.js';
	import { StorageError } from '../../storage/adapter.js';
	import { displayName, username } from '../../utils/user.js';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Input from '../ui/Input.svelte';
	import Modal from '../ui/Modal.svelte';

	// Account tab: who you are signed in as, guest data import, and deleting the account.
	type Props = { user: User | null };
	let { user }: Props = $props();

	let confirmOpen = $state(false);
	let typed = $state('');
	let deleting = $state(false);
	let error = $state('');

	const handle = $derived(username(user));
	const confirmed = $derived(typed.trim().toLowerCase() === handle.toLowerCase());

	function openConfirm() {
		typed = '';
		error = '';
		confirmOpen = true;
	}

	async function deleteAccount() {
		if (!confirmed || deleting) return;
		deleting = true;
		error = '';
		try {
			await getSocial().deleteAccount();
		} catch (e) {
			error = e instanceof StorageError ? e.message : 'Verwijderen is niet gelukt. Probeer het opnieuw.';
			deleting = false;
			return;
		}
		// The user is gone on the server; clear the session on this device too (it may report an error, which is fine).
		await auth.client?.auth.signOut({ scope: 'local' }).catch(() => undefined);
		profile.reset();
		confirmOpen = false;
		await goto('/', { invalidateAll: true });
		toasts.show('Je account is verwijderd');
		deleting = false;
	}
</script>

<div class="grid gap-5 lg:grid-cols-2 lg:items-start">
	<Card class="flex flex-col gap-4 lg:col-span-2">
		<h2 class="font-heading text-lg font-semibold">Account</h2>
		{#if user}
			<div class="flex flex-wrap items-center justify-between gap-3">
				<p class="min-w-0 text-text-muted">
					Ingelogd als <strong class="text-text">{displayName(user)}</strong> (@{handle}). Je sets, voortgang en instellingen staan in je account.
				</p>
				<Button variant="secondary" class="min-w-28" disabled={auth.signingOut} onclick={() => auth.signOut()}>
					{auth.signingOut ? 'Bezig…' : 'Uitloggen'}
				</Button>
			</div>
			{#if guestImport.hasData}
				<div class="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
					<p class="min-w-0 text-text-muted">
						Op dit apparaat staan nog gastgegevens ({guestImport.found?.sets ?? 0} sets). Zet ze over naar je account.
					</p>
					<Button variant="sage" class="min-w-28" onclick={() => (guestImport.open = true)}>Overzetten</Button>
				</div>
			{/if}
		{:else}
			<div class="flex flex-wrap items-center justify-between gap-3">
				<p class="min-w-0 text-text-muted">Je gebruikt Uiltje als gast: alles staat alleen op dit apparaat. Log in om je sets overal te hebben.</p>
				<Button href="/login" class="min-w-28">Inloggen</Button>
			</div>
		{/if}
	</Card>

	{#if user}
		<Card class="flex flex-col gap-3 border-rose-edge lg:col-span-2">
			<h2 class="font-heading text-lg font-semibold text-rose-edge">Account verwijderen</h2>
			<div class="flex flex-wrap items-center justify-between gap-3">
				<p class="min-w-0 flex-1 text-text-muted">
					Je profiel, al je sets, je voortgang, je vriendschappen en je profielfoto worden voorgoed verwijderd. Dit kan niet ongedaan worden gemaakt.
				</p>
				<Button variant="danger" onclick={openConfirm}>Account verwijderen</Button>
			</div>
		</Card>
	{/if}
</div>

<Modal bind:open={confirmOpen} title="Account verwijderen?">
	<form
		class="flex flex-col gap-4"
		onsubmit={(e) => {
			e.preventDefault();
			void deleteAccount();
		}}
	>
		<p>Dit verwijdert alles voorgoed. Typ je gebruikersnaam <strong>{handle}</strong> om te bevestigen.</p>
		<Input label="Gebruikersnaam" bind:value={typed} autocomplete="off" autocapitalize="none" spellcheck={false} />
		<p class="min-h-6 text-sm font-semibold text-rose-edge" role="alert">{error}</p>
		<div class="flex flex-wrap justify-end gap-3">
			<Button type="button" variant="ghost" disabled={deleting} onclick={() => (confirmOpen = false)}>Annuleren</Button>
			<Button type="submit" variant="danger" class="min-w-44" disabled={!confirmed || deleting}>{deleting ? 'Bezig…' : 'Voorgoed verwijderen'}</Button>
		</div>
	</form>
</Modal>
