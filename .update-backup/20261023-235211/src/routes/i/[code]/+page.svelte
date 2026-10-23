<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import InviteSkeleton from '#lib/components/skeleton/InviteSkeleton.svelte';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Owl from '#lib/components/ui/Owl.svelte';
	import { getSocial } from '#lib/social/index.js';
	import type { FoundPerson } from '#lib/social/types.js';
	import { toasts } from '#lib/state/toast.svelte.js';
	import { StorageError } from '#lib/storage/adapter.js';

	let { data }: PageProps = $props();
	const code = $derived(page.params.code ?? '');

	let inviter = $state<FoundPerson | null>(null);
	let phase = $state<'loading' | 'ready' | 'missing' | 'failed'>('loading');
	let busy = $state(false);
	let error = $state('');

	onMount(async () => {
		try {
			inviter = await getSocial().lookupInvite(code);
			phase = inviter ? 'ready' : 'missing';
		} catch {
			phase = 'failed';
		}
	});

	async function accept() {
		if (busy) return;
		busy = true;
		error = '';
		try {
			const outcome = await getSocial().acceptInvite(code);
			if (outcome === 'unknown') {
				phase = 'missing';
				return;
			}
			toasts.show(outcome === 'accepted' ? `Je bent nu bevriend met ${inviter?.displayName ?? 'deze gebruiker'}` : 'Jullie zijn al vrienden');
			await goto('/friends');
		} catch (e) {
			error = e instanceof StorageError ? e.message : 'Er ging iets mis. Probeer het opnieuw.';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>Uitnodiging · Uiltje</title></svelte:head>

{#if phase === 'loading'}
	<InviteSkeleton />
{:else if phase === 'ready' && inviter}
	<Card class="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
		<Avatar name={inviter.displayName} src={inviter.avatarUrl} size={96} />
		<h1 class="font-heading text-2xl font-semibold">{inviter.displayName}</h1>
		<p class="-mt-2 text-text-muted">@{inviter.username}</p>
		{#if inviter.relation === 'self'}
			<p class="text-text-muted">Dit is je eigen uitnodigingslink. Stuur hem naar iemand anders.</p>
			<Button href="/friends">Naar vrienden</Button>
		{:else if inviter.relation === 'friend'}
			<p class="text-text-muted">Jullie zijn al vrienden.</p>
			<Button href="/leaderboard">Naar de ranglijst</Button>
		{:else if data.user}
			<p class="text-text-muted">nodigt je uit om vrienden te worden op Uiltje.</p>
			<Button size="lg" class="min-w-48" disabled={busy} onclick={accept}>{busy ? 'Bezig…' : 'Vrienden worden'}</Button>
		{:else}
			<p class="text-text-muted">nodigt je uit om vrienden te worden op Uiltje. Log in of maak een account om verder te gaan.</p>
			<Button size="lg" href="/login?next={encodeURIComponent(`/i/${code}`)}">Inloggen</Button>
		{/if}
		<p class="min-h-6 text-sm font-semibold text-rose-edge" role="alert">{error}</p>
	</Card>
{:else}
	<div class="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
		<Owl pose="sleepy" size={96} />
		<h1 class="font-heading text-2xl font-semibold">{phase === 'missing' ? 'Deze uitnodiging werkt niet (meer)' : 'Laden lukt niet'}</h1>
		<p class="text-text-muted">{phase === 'missing' ? 'Vraag om een nieuwe link.' : 'Controleer je internetverbinding en probeer het opnieuw.'}</p>
		<Button href="/">Naar Uiltje</Button>
	</div>
{/if}
