<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { buildLibrary, entryToStudySet, type LibraryEntry } from '../../grammar/library';
	import { CATALOGUES } from '../../grammar/catalogues';
	import { createQuestionsApi } from '../../grammar/questions';
	import type { ApprovedQuestion } from '../../grammar/questions-core';
	import { auth } from '../../state/auth.svelte';
	import { toasts } from '../../state/toast.svelte';
	import { getStorage } from '../../storage';
	import { StorageError } from '../../storage/adapter';
	import { newId } from '../../utils/id';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Icon from '../ui/Icon.svelte';

	// Ready-made sets from the verified catalogues. "Toevoegen" makes your own copy in Mijn sets; you can change it freely.
	const storage = getStorage();
	let banks = $state<Record<string, ApprovedQuestion[]>>({});
	let addingId = $state<string | null>(null);
	let added = $state<Record<string, string>>({});

	const entries = $derived<LibraryEntry[]>(buildLibrary(banks));

	// The approved AI questions are added when you are signed in; the library works without them.
	onMount(async () => {
		const client = auth.client;
		if (!client || !auth.user) return;
		for (const catalogue of CATALOGUES) {
			try {
				const approved = await createQuestionsApi(client).approved(catalogue.id);
				banks = { ...banks, [catalogue.id]: approved };
			} catch {
				/* not an error: the set is then built from the syllabus text alone */
			}
		}
	});

	async function add(entry: LibraryEntry) {
		if (addingId) return;
		addingId = entry.id;
		try {
			const made = entryToStudySet(entry, newId);
			if (!made.ok) throw new StorageError(made.issues[0] ?? 'Deze set kon niet gemaakt worden.');
			await storage.saveSet(made.set);
			added[entry.id] = made.set.id;
			toasts.show(`"${entry.title}" staat nu in Mijn sets`);
		} catch (error) {
			toasts.show(error instanceof StorageError ? error.message : 'Toevoegen is mislukt');
		} finally {
			addingId = null;
		}
	}
</script>

<svelte:head><title>Kant en klaar · Uiltje</title></svelte:head>

<div class="flex flex-col gap-5">
	<a href="/sets" class="inline-flex w-fit items-center gap-1 text-sm font-semibold text-text-muted hover:text-text"><Icon name="chevron-left" size={18} /> Mijn sets</a>

	<div class="flex flex-wrap items-center gap-3">
		<div class="min-w-0 flex-1">
			<h1 class="font-heading text-3xl font-semibold">Kant en klaar</h1>
			<p class="text-text-muted">Kant-en-klare sets uit het examenprogramma. Voeg ze toe aan je eigen sets en pas ze aan zoals je wilt.</p>
		</div>
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		{#each entries as entry (entry.id)}
			<Card class="flex flex-col gap-3">
				<div class="min-w-0">
					<p class="text-xs font-semibold tracking-wide text-text-muted uppercase">{entry.subject}</p>
					<h2 class="font-heading text-xl font-semibold">{entry.title}</h2>
				</div>
				<p class="text-text-muted">{entry.description}</p>
				<p class="text-sm font-semibold">{entry.lists.length} {entry.lists.length === 1 ? 'lijst' : 'lijsten'} · {entry.questionCount} vragen</p>
				<ul class="flex flex-wrap gap-1.5 text-xs">
					{#each entry.lists as list (list.title)}<li class="rounded-full bg-surface-2 px-2.5 py-0.5 font-semibold">{list.title} ({list.rows.length})</li>{/each}
				</ul>
				<p class="text-xs text-text-muted">Bron: {entry.source}</p>
				<div class="mt-auto flex flex-wrap items-center gap-3">
					{#if added[entry.id]}
						<Button variant="secondary" onclick={() => goto(`/sets/${added[entry.id]}`)}><Icon name="check" size={18} /> Toegevoegd · openen</Button>
					{:else}
						<Button disabled={addingId !== null} onclick={() => add(entry)}><Icon name="plus" size={18} /> {addingId === entry.id ? 'Toevoegen…' : 'Toevoegen aan mijn sets'}</Button>
					{/if}
				</div>
			</Card>
		{/each}
	</div>
</div>
