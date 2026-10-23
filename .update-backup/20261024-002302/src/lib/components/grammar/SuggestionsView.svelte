<script lang="ts">
	import { untrack } from 'svelte';
	import { createSuggestionsApi } from '../../grammar/suggestions';
	import type { Suggestion, SuggestionStatus } from '../../grammar/suggestions-core';
	import { admin } from '../../state/admin.svelte';
	import { auth } from '../../state/auth.svelte';
	import { StorageError } from '../../storage/adapter';
	import SuggestionModal from '../editor/SuggestionModal.svelte';
	import SuggestionsSkeleton from '../skeleton/SuggestionsSkeleton.svelte';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Icon from '../ui/Icon.svelte';
	import Owl from '../ui/Owl.svelte';

	// Your own grammar suggestions and their status. The owner reviews everyone's suggestions on /review.
	let loading = $state(true);
	let failed = $state('');
	let mine = $state<Suggestion[]>([]);
	let formOpen = $state(false);

	const STATUS_LABEL: Record<SuggestionStatus, string> = { new: 'Wacht op beoordeling', accepted: 'Goedgekeurd', rejected: 'Afgewezen' };
	const dateFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' });

	async function load() {
		const client = auth.client;
		const user = auth.user;
		if (!client || !user) return;
		loading = true;
		failed = '';
		try {
			mine = await createSuggestionsApi(client).mine(user.id);
		} catch (error) {
			failed = error instanceof StorageError ? error.message : 'Laden is mislukt.';
		} finally {
			loading = false;
		}
	}

	// Loads once the signed-in user is known.
	$effect(() => {
		if (auth.client && auth.user) untrack(() => void load());
		else if (!auth.user) loading = false;
	});

	$effect(() => {
		void auth.user;
		void admin.refresh();
	});
</script>

<svelte:head><title>Voorstellen · Uiltje</title></svelte:head>

<div class="mx-auto flex max-w-3xl flex-col gap-5">
	<div class="flex flex-wrap items-center gap-4">
		<Owl pose="idle" size={64} />
		<div class="min-w-0 flex-1">
			<h1 class="font-heading text-3xl font-semibold">Voorstellen</h1>
			<p class="text-text-muted">Regels en begrippen die standaard in de app zouden moeten staan.</p>
		</div>
		{#if auth.user}<Button onclick={() => (formOpen = true)}><Icon name="plus" size={18} /> Nieuw voorstel</Button>{/if}
	</div>

	{#if !auth.user}
		<Card class="flex flex-col items-start gap-3">
			<p class="text-text-muted">Log in om een regel voor te stellen en te zien wat ermee gebeurd is.</p>
			<Button href="/login?next=/suggesties"><Icon name="log-in" size={18} /> Inloggen</Button>
		</Card>
	{:else if loading}
		<SuggestionsSkeleton />
	{:else if failed}
		<Card class="flex flex-col items-start gap-3" role="alert">
			<p class="font-semibold text-rose-edge">{failed}</p>
			<Button variant="secondary" onclick={load}>Opnieuw proberen</Button>
		</Card>
	{:else}
		{#if admin.isAdmin}
			<Card class="flex flex-wrap items-center justify-between gap-3">
				<p class="text-text-muted">Voorstellen van anderen beoordeel je op de reviewpagina.</p>
				<Button href="/review?tab=voorstellen" variant="secondary" size="sm">Naar review</Button>
			</Card>
		{/if}

		{#each mine as item (item.id)}
			<Card class="flex flex-col gap-2">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<h2 class="min-w-0 font-heading text-lg font-semibold">{item.term} <span class="font-body text-sm font-normal text-text-muted">· {item.subject}</span></h2>
					<span class="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap">{STATUS_LABEL[item.status]} · {dateFormat.format(item.createdAt)}</span>
				</div>
				<p>{item.definition}</p>
				{#if item.example}<p class="rounded-tile bg-surface-2 px-3 py-2 text-sm">{item.example}{item.exampleTranslation ? ` — ${item.exampleTranslation}` : ''}</p>{/if}
				{#if item.source}<p class="text-sm text-text-muted">Bron: {item.source}</p>{/if}
			</Card>
		{:else}
			<Card class="flex flex-col items-center gap-2 text-center text-text-muted">
				<p>Je hebt nog niets voorgesteld.</p>
				<p class="text-sm">Zie je bij het kiezen van stijlfiguren of grammatica iets missen? Stel het hier voor.</p>
			</Card>
		{/each}
	{/if}
</div>

<SuggestionModal bind:open={formOpen} onsent={load} />
