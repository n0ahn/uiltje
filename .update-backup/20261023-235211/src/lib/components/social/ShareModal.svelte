<script lang="ts">
	import { auth } from '../../state/auth.svelte';
	import { getSocial } from '../../social';
	import type { Friendship } from '../../social/types';
	import { toasts } from '../../state/toast.svelte';
	import { StorageError } from '../../storage/adapter';
	import Button from '../ui/Button.svelte';
	import Chip from '../ui/Chip.svelte';
	import Icon from '../ui/Icon.svelte';
	import Input from '../ui/Input.svelte';
	import Modal from '../ui/Modal.svelte';
	import Skeleton from '../ui/Skeleton.svelte';
	import PersonRow from './PersonRow.svelte';

	// Share one of your sets: by link (anyone with it gets their own copy) or straight to a friend.
	type Props = { open?: boolean; setId: string; title: string };
	let { open = $bindable(false), setId, title }: Props = $props();

	let token = $state<string | null>(null);
	let friends = $state<Friendship[]>([]);
	let loading = $state(true);
	let busy = $state(false);
	let error = $state('');
	let sent = $state<Record<string, boolean>>({});

	const link = $derived(token ? `${location.origin}/s/${token}` : '');
	const message = (e: unknown) => (e instanceof StorageError ? e.message : 'Er ging iets mis. Probeer het opnieuw.');

	// Read the current state each time the dialog opens.
	$effect(() => {
		if (!open || !auth.user) return;
		let cancelled = false;
		loading = true;
		error = '';
		sent = {};
		const social = getSocial();
		Promise.all([social.getShareToken(setId), social.listFriendships()])
			.then(([t, list]) => {
				if (cancelled) return;
				token = t;
				friends = list.filter((f) => f.status === 'accepted');
			})
			.catch((e) => !cancelled && (error = message(e)))
			.finally(() => !cancelled && (loading = false));
		return () => (cancelled = true);
	});

	async function run(job: () => Promise<void>) {
		if (busy) return;
		busy = true;
		error = '';
		try {
			await job();
		} catch (e) {
			error = message(e);
		} finally {
			busy = false;
		}
	}

	const makeLink = () => run(async () => void (token = await getSocial().enableShare(setId)));
	const stopSharing = () =>
		run(async () => {
			await getSocial().disableShare(setId);
			token = null;
			toasts.show('De link werkt niet meer');
		});
	const send = (friend: Friendship) =>
		run(async () => {
			await getSocial().sendSetToFriend(setId, friend.id);
			sent = { ...sent, [friend.id]: true };
			toasts.show(`Verstuurd naar ${friend.displayName}`);
		});

	async function copy() {
		try {
			await navigator.clipboard.writeText(link);
			toasts.show('Link gekopieerd');
		} catch {
			toasts.show('Kopiëren lukt niet. Selecteer de link en kopieer hem zelf.');
		}
	}
</script>

<Modal bind:open title="“{title}” delen">
	{#if !auth.user}
		<p>Log in om sets te delen. Een set moet in je account staan om gedeeld te kunnen worden.</p>
	{:else}
		<div class="flex flex-col gap-5">
			<section class="flex flex-col gap-2" aria-labelledby="share-link">
				<h3 id="share-link" class="font-heading text-lg font-semibold">Met een link</h3>
				{#if loading}
					<Skeleton class="h-12 w-full" />
				{:else if token}
					<Input label="Link" value={link} readonly onfocus={(e) => e.currentTarget.select()} />
					<div class="flex flex-wrap gap-3">
						<Button variant="secondary" class="min-w-32" onclick={copy}><Icon name="copy" size={18} /> Kopiëren</Button>
						<Button variant="ghost" disabled={busy} onclick={stopSharing}>Stoppen met delen</Button>
					</div>
				{:else}
					<p class="text-sm text-text-muted">Iedereen met de link kan een eigen kopie van deze set maken. Je voortgang wordt niet gedeeld.</p>
					<div><Button variant="secondary" class="min-w-40" disabled={busy} onclick={makeLink}>Link maken</Button></div>
				{/if}
			</section>

			<section class="flex flex-col gap-2" aria-labelledby="share-friends">
				<h3 id="share-friends" class="font-heading text-lg font-semibold">Naar een vriend</h3>
				{#if loading}
					<Skeleton class="h-12 w-full" />
				{:else if friends.length === 0}
					<p class="text-sm text-text-muted">Je hebt nog geen vrienden. <a href="/friends" class="font-bold text-primary-text hover:underline">Voeg een vriend toe</a>.</p>
				{:else}
					<ul class="flex max-h-56 flex-col gap-3 overflow-y-auto">
						{#each friends as friend (friend.id)}
							<li>
								<PersonRow person={friend} size={32}>
									{#snippet actions()}
										{#if sent[friend.id]}
											<Chip>Verstuurd</Chip>
										{:else}
											<Button size="sm" class="min-w-28" disabled={busy} onclick={() => send(friend)}>Versturen</Button>
										{/if}
									{/snippet}
								</PersonRow>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
			<p class="min-h-6 text-sm font-semibold text-rose-edge" role="alert">{error}</p>
		</div>
	{/if}
	{#snippet actions()}
		<Button variant="ghost" onclick={() => (open = false)}>Sluiten</Button>
	{/snippet}
</Modal>
