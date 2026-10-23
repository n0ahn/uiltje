<script lang="ts">
	import { auth } from '../../state/auth.svelte';
	import { getSocial } from '../../social';
	import type { Friendship } from '../../social/types';
	import { toasts } from '../../state/toast.svelte';
	import { StorageError } from '../../storage/adapter';
	import Button from '../ui/Button.svelte';
	import Chip from '../ui/Chip.svelte';
	import Modal from '../ui/Modal.svelte';
	import Skeleton from '../ui/Skeleton.svelte';
	import PersonRow from './PersonRow.svelte';

	// Challenge a friend on one of your sets: they look at it, make an own copy and take a test. Best scores are compared.
	type Props = { open?: boolean; setId: string; title: string; rowCount: number };
	let { open = $bindable(false), setId, title, rowCount }: Props = $props();

	let friends = $state<Friendship[]>([]);
	let loading = $state(true);
	let busy = $state(false);
	let error = $state('');
	let sent = $state<Record<string, boolean>>({});

	$effect(() => {
		if (!open || !auth.user) return;
		let cancelled = false;
		loading = true;
		error = '';
		sent = {};
		getSocial()
			.listFriendships()
			.then((list) => !cancelled && (friends = list.filter((f) => f.status === 'accepted')))
			.catch((e) => !cancelled && (error = e instanceof StorageError ? e.message : 'Laden lukt niet. Probeer het opnieuw.'))
			.finally(() => !cancelled && (loading = false));
		return () => (cancelled = true);
	});

	async function challenge(friend: Friendship) {
		if (busy) return;
		busy = true;
		error = '';
		try {
			await getSocial().sendChallenge(setId, friend.id);
			sent = { ...sent, [friend.id]: true };
			toasts.show(`${friend.displayName} is uitgedaagd`);
		} catch (e) {
			error = e instanceof StorageError ? e.message : 'Uitdagen is niet gelukt. Probeer het opnieuw.';
		} finally {
			busy = false;
		}
	}
</script>

<Modal bind:open title="Vriend uitdagen">
	{#if !auth.user}
		<p>Log in om een vriend uit te dagen. De set moet in je account staan.</p>
	{:else if rowCount === 0}
		<p>Deze set heeft nog geen rijen. Voeg eerst iets toe om uit te dagen.</p>
	{:else}
		<div class="flex flex-col gap-4">
			<p class="text-text-muted">
				Je vriend krijgt "{title}" te zien, maakt er een eigen kopie van en maakt een toets. Daarna zie je op <a href="/uitdagingen" class="font-bold text-primary-text hover:underline">Uitdagingen</a> wie het hoogste cijfer haalt. Alleen toetsen over de hele set na het versturen tellen mee, en voor jou ook. Een toets met maar een deel van de set telt niet.
			</p>
			{#if loading}
				<Skeleton class="h-12 w-full" />
			{:else if friends.length === 0}
				<p class="text-sm text-text-muted">Je hebt nog geen vrienden. <a href="/friends" class="font-bold text-primary-text hover:underline">Voeg een vriend toe</a>.</p>
			{:else}
				<ul class="flex max-h-64 flex-col gap-3 overflow-y-auto">
					{#each friends as friend (friend.id)}
						<li>
							<PersonRow person={friend} size={32}>
								{#snippet actions()}
									{#if sent[friend.id]}
										<Chip>Uitgedaagd</Chip>
									{:else}
										<Button size="sm" class="min-w-28" disabled={busy} onclick={() => challenge(friend)}>Uitdagen</Button>
									{/if}
								{/snippet}
							</PersonRow>
						</li>
					{/each}
				</ul>
			{/if}
			<p class="min-h-6 text-sm font-semibold text-rose-edge" role="alert">{error}</p>
		</div>
	{/if}
	{#snippet actions()}
		<Button variant="ghost" onclick={() => (open = false)}>Sluiten</Button>
	{/snippet}
</Modal>
