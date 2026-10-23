<script lang="ts">
	import { untrack } from 'svelte';
	import { createSuggestionsApi } from '../../grammar/suggestions';
	import type { Suggestion, SuggestionStatus } from '../../grammar/suggestions-core';
	import { auth } from '../../state/auth.svelte';
	import { toasts } from '../../state/toast.svelte';
	import { StorageError } from '../../storage/adapter';
	import SuggestionModal from '../editor/SuggestionModal.svelte';
	import SuggestionsSkeleton from '../skeleton/SuggestionsSkeleton.svelte';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Icon from '../ui/Icon.svelte';
	import Owl from '../ui/Owl.svelte';
	import Segmented from '../ui/Segmented.svelte';

	// Your own grammar suggestions and their status. The owner also sees everything that waits for a decision.
	let loading = $state(true);
	let failed = $state('');
	let admin = $state(false);
	let mine = $state<Suggestion[]>([]);
	let pending = $state<Suggestion[]>([]);
	let tab = $state<'review' | 'mine'>('mine');
	let busyId = $state<string | null>(null);
	let formOpen = $state(false);
	let editingId = $state<string | null>(null);
	let editForm = $state({ term: '', definition: '', example: '', exampleTranslation: '', source: '' });
	let editError = $state('');

	const STATUS_LABEL: Record<SuggestionStatus, string> = { new: 'Wacht op beoordeling', accepted: 'Goedgekeurd', rejected: 'Afgewezen' };
	const dateFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' });

	async function load() {
		const client = auth.client;
		const user = auth.user;
		if (!client || !user) return;
		loading = true;
		failed = '';
		try {
			const api = createSuggestionsApi(client);
			const [isAdmin, own] = await Promise.all([api.isAdmin(), api.mine(user.id)]);
			admin = isAdmin;
			mine = own;
			pending = isAdmin ? await api.pending() : [];
			tab = isAdmin && pending.length > 0 ? 'review' : 'mine';
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

	async function review(item: Suggestion, status: SuggestionStatus) {
		if (!auth.client || busyId) return;
		busyId = item.id;
		try {
			await createSuggestionsApi(auth.client).review(item.id, status);
			pending = pending.filter((p) => p.id !== item.id);
			mine = mine.map((m) => (m.id === item.id ? { ...m, status } : m));
			toasts.show(status === 'accepted' ? `"${item.term}" is goedgekeurd en staat nu voor iedereen in de lijst` : `"${item.term}" is afgewezen`);
		} catch (error) {
			toasts.show(error instanceof StorageError ? error.message : 'Dat lukte niet');
		} finally {
			busyId = null;
		}
	}

	function startEdit(item: Suggestion) {
		editingId = item.id;
		editForm = { term: item.term, definition: item.definition, example: item.example, exampleTranslation: item.exampleTranslation, source: item.source };
		editError = '';
	}

	async function saveEdit(item: Suggestion) {
		if (!auth.client || busyId) return;
		busyId = item.id;
		try {
			await createSuggestionsApi(auth.client).edit(item.id, item.subject, editForm);
			const apply = (s: Suggestion) => (s.id === item.id ? { ...s, ...editForm } : s);
			pending = pending.map(apply);
			mine = mine.map(apply);
			editingId = null;
		} catch (error) {
			editError = error instanceof StorageError ? error.message : 'Aanpassen is mislukt.';
		} finally {
			busyId = null;
		}
	}

	const tabOptions = $derived([
		{ id: 'review' as const, name: `Te beoordelen (${pending.length})` },
		{ id: 'mine' as const, name: `Mijn voorstellen (${mine.length})` }
	]);
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
		{#if admin}<Segmented legend="Welke voorstellen?" options={tabOptions} bind:value={tab} />{/if}

		{#snippet card(item: Suggestion, canReview: boolean)}
			<Card class="flex flex-col gap-2">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<h2 class="min-w-0 font-heading text-lg font-semibold">{item.term} <span class="font-body text-sm font-normal text-text-muted">· {item.subject}</span></h2>
					<span class="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap">{STATUS_LABEL[item.status]} · {dateFormat.format(item.createdAt)}</span>
				</div>
				{#if editingId === item.id}
					<label>
						<span class="mb-1 block text-sm font-semibold text-text-muted">Naam</span>
						<input class="input" bind:value={editForm.term} />
					</label>
					<label>
						<span class="mb-1 block text-sm font-semibold text-text-muted">Uitleg</span>
						<textarea class="input min-h-20" bind:value={editForm.definition}></textarea>
					</label>
					<div class="grid gap-3 sm:grid-cols-2">
						<label>
							<span class="mb-1 block text-sm font-semibold text-text-muted">Voorbeeld</span>
							<input class="input" bind:value={editForm.example} spellcheck="false" />
						</label>
						<label>
							<span class="mb-1 block text-sm font-semibold text-text-muted">Vertaling</span>
							<input class="input" bind:value={editForm.exampleTranslation} />
						</label>
					</div>
					<label>
						<span class="mb-1 block text-sm font-semibold text-text-muted">Bron</span>
						<input class="input" bind:value={editForm.source} />
					</label>
					<p class="min-h-5 text-sm font-semibold text-rose-edge" role="alert">{editError}</p>
					<div class="flex gap-2">
						<Button size="sm" disabled={busyId !== null} onclick={() => saveEdit(item)}>Opslaan</Button>
						<Button size="sm" variant="ghost" onclick={() => (editingId = null)}>Annuleren</Button>
					</div>
				{:else}
				<p>{item.definition}</p>
				{#if item.example}<p class="rounded-tile bg-surface-2 px-3 py-2 text-sm">{item.example}{item.exampleTranslation ? ` — ${item.exampleTranslation}` : ''}</p>{/if}
				{#if item.source}<p class="text-sm text-text-muted">Bron: {item.source}</p>{/if}
				{#if canReview}
					<div class="mt-1 flex flex-wrap gap-2">
						<Button size="sm" disabled={busyId !== null} onclick={() => review(item, 'accepted')}><Icon name="check" size={16} /> Goedkeuren</Button>
						<Button size="sm" variant="secondary" disabled={busyId !== null} onclick={() => startEdit(item)}><Icon name="pencil" size={16} /> Bewerken</Button>
						<Button size="sm" variant="ghost" disabled={busyId !== null} onclick={() => review(item, 'rejected')}><Icon name="x" size={16} /> Afwijzen</Button>
					</div>
				{/if}
				{/if}
			</Card>
		{/snippet}

		{#if admin && tab === 'review'}
			{#each pending as item (item.id)}{@render card(item, true)}{:else}
				<Card class="text-center text-text-muted">Niets te beoordelen. Goed bezig!</Card>
			{/each}
		{:else}
			{#each mine as item (item.id)}{@render card(item, false)}{:else}
				<Card class="flex flex-col items-center gap-2 text-center text-text-muted">
					<p>Je hebt nog niets voorgesteld.</p>
					<p class="text-sm">Zie je bij het kiezen van stijlfiguren of grammatica iets missen? Stel het hier voor.</p>
				</Card>
			{/each}
		{/if}
	{/if}
</div>

<SuggestionModal bind:open={formOpen} onsent={load} />
