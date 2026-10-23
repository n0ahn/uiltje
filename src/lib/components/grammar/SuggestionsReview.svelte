<script lang="ts">
	import { untrack } from 'svelte';
	import { createSuggestionsApi } from '../../grammar/suggestions';
	import type { Suggestion, SuggestionStatus } from '../../grammar/suggestions-core';
	import { auth } from '../../state/auth.svelte';
	import { toasts } from '../../state/toast.svelte';
	import { StorageError } from '../../storage/adapter';
	import SuggestionsSkeleton from '../skeleton/SuggestionsSkeleton.svelte';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Icon from '../ui/Icon.svelte';

	// Owner only, part of /review: suggestions from users that wait for a decision (approve, edit, reject).
	let { oncount }: { oncount?: (n: number) => void } = $props();

	let loading = $state(true);
	let failed = $state('');
	let pending = $state<Suggestion[]>([]);
	let busyId = $state<string | null>(null);
	let editingId = $state<string | null>(null);
	let editForm = $state({ term: '', definition: '', example: '', exampleTranslation: '', source: '' });
	let editError = $state('');

	const dateFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' });

	async function load() {
		if (!auth.client) return;
		loading = true;
		failed = '';
		try {
			pending = await createSuggestionsApi(auth.client).pending();
			oncount?.(pending.length);
		} catch (error) {
			failed = error instanceof StorageError ? error.message : 'Laden is mislukt.';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (auth.client && auth.user) untrack(() => void load());
	});

	async function review(item: Suggestion, status: SuggestionStatus) {
		if (!auth.client || busyId) return;
		busyId = item.id;
		try {
			await createSuggestionsApi(auth.client).review(item.id, status);
			pending = pending.filter((p) => p.id !== item.id);
			oncount?.(pending.length);
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
			pending = pending.map((s) => (s.id === item.id ? { ...s, ...editForm } : s));
			editingId = null;
		} catch (error) {
			editError = error instanceof StorageError ? error.message : 'Aanpassen is mislukt.';
		} finally {
			busyId = null;
		}
	}
</script>

{#if loading}
	<SuggestionsSkeleton />
{:else if failed}
	<Card class="flex flex-col items-start gap-3">
		<p class="font-semibold text-rose-edge" role="alert">{failed}</p>
		<Button variant="secondary" onclick={load}>Opnieuw proberen</Button>
	</Card>
{:else}
	<div class="mx-auto flex w-full max-w-3xl flex-col gap-4">
		{#each pending as item (item.id)}
			<Card class="flex flex-col gap-2">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<h2 class="min-w-0 font-heading text-lg font-semibold">{item.term} <span class="font-body text-sm font-normal text-text-muted">· {item.subject}</span></h2>
					<span class="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap">{dateFormat.format(item.createdAt)}</span>
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
					<div class="mt-1 flex flex-wrap gap-2">
						<Button size="sm" disabled={busyId !== null} onclick={() => review(item, 'accepted')}><Icon name="check" size={16} /> Goedkeuren</Button>
						<Button size="sm" variant="secondary" disabled={busyId !== null} onclick={() => startEdit(item)}><Icon name="pencil" size={16} /> Bewerken</Button>
						<Button size="sm" variant="ghost" disabled={busyId !== null} onclick={() => review(item, 'rejected')}><Icon name="x" size={16} /> Afwijzen</Button>
					</div>
				{/if}
			</Card>
		{:else}
			<Card class="text-center text-text-muted">Geen voorstellen om te beoordelen. Goed bezig!</Card>
		{/each}
	</div>
{/if}
