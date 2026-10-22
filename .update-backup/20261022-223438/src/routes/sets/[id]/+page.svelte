<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import PracticeMenu from '#lib/components/practice/PracticeMenu.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Dropdown from '#lib/components/ui/Dropdown.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import MenuItem from '#lib/components/ui/MenuItem.svelte';
	import Modal from '#lib/components/ui/Modal.svelte';
	import Owl from '#lib/components/ui/Owl.svelte';
	import ShareModal from '#lib/components/social/ShareModal.svelte';
	import SetPageSkeleton from '#lib/components/skeleton/SetPageSkeleton.svelte';
	import ProgressBar from '#lib/components/ui/ProgressBar.svelte';
	import { rowKey } from '#lib/engine/stages.js';
	import { downloadSetJson } from '#lib/editor/json.js';
	import type { StudySet } from '#lib/schema/types.js';
	import { toasts } from '#lib/state/toast.svelte.js';
	import { getStorage } from '#lib/storage/index.js';
	import type { ProgressMap } from '#lib/storage/adapter.js';

	// The page of one set: look at everything first, then practise or edit (like StudyGo).
	const storage = getStorage();
	let set = $state<StudySet | null>(null);
	let progress = $state<ProgressMap>({});
	let missing = $state(false);
	let confirmOpen = $state(false);
	let shareOpen = $state(false);
	let showAll = $state<Record<string, boolean>>({});

	const PREVIEW = 10;

	onMount(async () => {
		const found = await storage.getSet(page.params.id ?? '');
		if (!found) {
			missing = true;
			return;
		}
		set = found;
		try {
			progress = await storage.getProgress(found.id);
		} catch {
			/* no progress yet */
		}
	});

	const rowTotal = $derived(set?.lists.reduce((n, l) => n + l.rows.length, 0) ?? 0);
	const known = (listId: string, rowId: string) => (progress[rowKey(set?.id ?? '', listId, rowId)]?.streak ?? 0) >= 2;
	const knownTotal = $derived(set ? set.lists.reduce((n, l) => n + l.rows.filter((r) => known(l.id, r.id)).length, 0) : 0);
	const onlyWords = $derived(!!set && set.lists.length > 0 && set.lists.every((l) => l.kind === 'vocab'));

	async function remove() {
		if (!set) return;
		try {
			await storage.deleteSet(set.id);
			toasts.show(`"${set.title}" is verwijderd`);
			await goto('/sets');
		} catch {
			toasts.show('Verwijderen is mislukt');
			confirmOpen = false;
		}
	}
</script>

<svelte:head><title>{set?.title ?? 'Set'} · Uiltje</title></svelte:head>

{#if missing}
	<div class="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
		<Owl pose="sleepy" size={96} />
		<h1 class="font-heading text-2xl font-semibold">Deze set bestaat niet (meer)</h1>
		<Button href="/sets">Naar mijn sets</Button>
	</div>
{:else if !set}
	<SetPageSkeleton />
{:else}
	<div class="flex flex-col gap-5">
		<a href="/sets" class="inline-flex w-fit items-center gap-1 text-sm font-semibold text-text-muted hover:text-text"><Icon name="chevron-left" size={18} /> Mijn sets</a>

		<div class="flex flex-col gap-1">
			<h1 class="font-heading text-3xl font-semibold">{set.title}</h1>
			<p class="text-text-muted">
				{set.subject}{set.folder ? ` · ${set.folder}` : ''} · {set.lists.length}
				{onlyWords ? (set.lists.length === 1 ? 'lijst' : 'lijsten') : set.lists.length === 1 ? 'rijtje' : 'rijtjes'} · {rowTotal}
				{onlyWords ? (rowTotal === 1 ? 'woord' : 'woorden') : rowTotal === 1 ? 'vorm' : 'vormen'}
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<PracticeMenu href="/sets/{set.id}/practice" disabled={rowTotal === 0} />
			<Button href="/sets/{set.id}/edit" variant="secondary" size="lg"><Icon name="pencil" size={18} /> Bewerken</Button>
			<Dropdown label="Meer acties" variant="ghost" size="lg" iconOnly align="right">
				{#snippet trigger()}<Icon name="more" size={22} />{/snippet}
				<MenuItem icon="sparkles" href="/sets/ai?to={set.id}">Toevoegen met AI</MenuItem>
				<MenuItem icon="share" onclick={() => (shareOpen = true)}>Delen…</MenuItem>
				<MenuItem icon="download" onclick={() => set && downloadSetJson(set)}>Exporteren als JSON</MenuItem>
				<MenuItem icon="trash" danger onclick={() => (confirmOpen = true)}>Set verwijderen</MenuItem>
			</Dropdown>
		</div>

		{#if rowTotal > 0}
			<Card class="flex flex-col gap-2">
				<div class="flex items-baseline justify-between gap-3">
					<h2 class="font-heading text-lg font-semibold">Voortgang</h2>
					<p class="text-sm text-text-muted">{knownTotal} van {rowTotal} onder de knie</p>
				</div>
				<ProgressBar value={knownTotal / rowTotal} label="Onder de knie" />
			</Card>
		{/if}

		<div class="grid items-start gap-5 xl:grid-cols-2">
			{#each set.lists as list (list.id)}
				{@const shown = showAll[list.id] ? list.rows : list.rows.slice(0, PREVIEW)}
				<Card class="flex flex-col gap-3">
					<div>
						<h2 class="font-heading text-lg font-semibold">{list.title}</h2>
						{#if list.group}<p class="text-sm text-text-muted">{list.group}</p>{/if}
					</div>
					{#if list.rows.length === 0}
						<p class="text-sm text-text-muted">Deze lijst is nog leeg.</p>
					{:else}
						<div class="grid grid-cols-[1fr_1fr_auto] gap-x-4 text-sm font-semibold text-text-muted">
							<span>{list.columns.prompt}</span><span>{list.columns.answer}</span><span class="sr-only">Status</span>
						</div>
						<ul class="flex flex-col gap-1.5">
							{#each shown as row (row.id)}
								<li class="grid grid-cols-[1fr_1fr_auto] items-center gap-x-4 rounded-tile bg-surface-2 px-3 py-2">
									<span class="min-w-0 wrap-break-word">{row.prompt}</span>
									<span class="min-w-0 wrap-break-word">{row.answers.join(' / ')}</span>
									<span
										class={['size-2.5 rounded-full', known(list.id, row.id) ? 'bg-sage' : 'bg-border']}
										role="img"
										aria-label={known(list.id, row.id) ? 'Onder de knie' : 'Nog niet onder de knie'}
									></span>
								</li>
							{/each}
						</ul>
						{#if list.rows.length > PREVIEW}
							<div>
								<Button variant="ghost" size="sm" onclick={() => (showAll[list.id] = !showAll[list.id])}>
									{showAll[list.id] ? 'Minder tonen' : `Alle ${list.rows.length} tonen`}
								</Button>
							</div>
						{/if}
					{/if}
				</Card>
			{/each}
		</div>
	</div>

	<ShareModal bind:open={shareOpen} setId={set.id} title={set.title} />

	<Modal bind:open={confirmOpen} title="Set verwijderen?">
		<p>"{set.title}" en je voortgang daarop worden verwijderd. Dit kan niet ongedaan gemaakt worden.</p>
		{#snippet actions()}
			<Button variant="ghost" onclick={() => (confirmOpen = false)}>Annuleren</Button>
			<Button variant="danger" onclick={remove}>Verwijderen</Button>
		{/snippet}
	</Modal>
{/if}
