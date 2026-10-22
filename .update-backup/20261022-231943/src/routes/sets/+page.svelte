<script lang="ts">
	import { onMount } from 'svelte';
	import PracticeMenu from '#lib/components/practice/PracticeMenu.svelte';
	import CardImportModal from '#lib/components/editor/CardImportModal.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import Modal from '#lib/components/ui/Modal.svelte';
	import Owl from '#lib/components/ui/Owl.svelte';
	import CardGridSkeleton from '#lib/components/skeleton/CardGridSkeleton.svelte';
	import { toasts } from '#lib/state/toast.svelte.js';
	import { getStorage } from '#lib/storage/index.js';
	import type { SetSummary } from '#lib/storage/adapter.js';

	const storage = getStorage();
	let sets = $state<SetSummary[] | null>(null);
	let importOpen = $state(false);

	// Organising: pick sets, then move them to a folder or delete them.
	const NO_FOLDER = '\u0000none';
	let filter = $state<string>('');
	let selecting = $state(false);
	let selected = $state<string[]>([]);
	let moveOpen = $state(false);
	let moveChoice = $state<string>(NO_FOLDER);
	let newFolder = $state('');
	let deleteOpen = $state(false);
	let busy = $state(false);

	const folders = $derived([...new Set((sets ?? []).map((s) => s.folder?.trim()).filter((f): f is string => !!f))].sort((a, b) => a.localeCompare(b, 'nl')));
	const hasUnfiled = $derived((sets ?? []).some((s) => !s.folder?.trim()));
	const visible = $derived((sets ?? []).filter((s) => (filter === '' ? true : filter === NO_FOLDER ? !s.folder?.trim() : s.folder?.trim() === filter)));
	// With the "Alles" filter and at least one folder, sets are shown under their folder name.
	const groups = $derived.by(() => {
		if (filter !== '' || folders.length === 0) return [{ name: '', sets: visible }];
		const list = folders.map((name) => ({ name, sets: visible.filter((s) => s.folder?.trim() === name) }));
		const loose = visible.filter((s) => !s.folder?.trim());
		return loose.length > 0 ? [...list, { name: 'Zonder map', sets: loose }] : list;
	});

	async function load() {
		sets = await storage.listSets();
		const ids = new Set(sets.map((s) => s.id));
		selected = selected.filter((id) => ids.has(id));
		if (filter !== '' && filter !== NO_FOLDER && !folders.includes(filter)) filter = '';
	}
	onMount(() => void load());

	function toggle(id: string) {
		selected = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
	}

	function stopSelecting() {
		selecting = false;
		selected = [];
	}

	function openMove() {
		moveChoice = folders[0] ?? NO_FOLDER;
		newFolder = '';
		moveOpen = true;
	}

	async function applyMove() {
		const folder = moveChoice === '\u0001new' ? newFolder.trim() : moveChoice === NO_FOLDER ? '' : moveChoice;
		if (moveChoice === '\u0001new' && folder === '') return;
		busy = true;
		let failed = 0;
		for (const id of selected) {
			try {
				const set = await storage.getSet(id);
				if (!set) throw new Error('missing');
				await storage.saveSet({ ...set, folder: folder || null });
			} catch {
				failed++;
			}
		}
		const moved = selected.length - failed;
		busy = false;
		moveOpen = false;
		toasts.show(failed > 0 ? `${moved} verplaatst, ${failed} mislukt` : `${moved} ${moved === 1 ? 'set' : 'sets'} verplaatst`);
		stopSelecting();
		await load();
	}

	async function applyDelete() {
		busy = true;
		let failed = 0;
		for (const id of selected) {
			try {
				await storage.deleteSet(id);
			} catch {
				failed++;
			}
		}
		const removed = selected.length - failed;
		busy = false;
		deleteOpen = false;
		toasts.show(failed > 0 ? `${removed} verwijderd, ${failed} mislukt` : `${removed} ${removed === 1 ? 'set' : 'sets'} verwijderd`);
		stopSelecting();
		await load();
	}
</script>

<svelte:head><title>Mijn sets · Uiltje</title></svelte:head>

<div class="mb-6 flex flex-wrap items-center gap-3">
	<h1 class="min-w-0 flex-1 font-heading text-3xl font-semibold">Mijn sets</h1>
	{#if sets && sets.length > 0}
		<Button variant={selecting ? 'primary' : 'secondary'} onclick={() => (selecting ? stopSelecting() : (selecting = true))} aria-pressed={selecting}>
			<Icon name={selecting ? 'check' : 'layers'} size={18} /> {selecting ? 'Klaar' : 'Ordenen'}
		</Button>
	{/if}
	<Button href="/sets/ai" variant="secondary"><Icon name="sparkles" size={18} /> Met AI</Button>
	<Button variant="secondary" onclick={() => (importOpen = true)}><Icon name="paste" size={18} /> Quizlet / StudyGo</Button>
	<Button href="/sets/new?import=1" variant="secondary"><Icon name="import" size={18} /> Importeren</Button>
	<Button href="/sets/new"><Icon name="plus" size={18} /> Nieuwe set</Button>
</div>

{#if sets === null}
	<CardGridSkeleton />
{:else if sets.length === 0}
	<div class="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
		<Owl pose="idle" size={96} />
		<h2 class="font-heading text-2xl font-semibold">Nog geen sets</h2>
		<p class="text-text-muted">Maak je eerste set met een sjabloon, met AI, of importeer er een uit Quizlet of StudyGo.</p>
		<Button href="/sets/new">Eerste set maken</Button>
	</div>
{:else}
	{#if folders.length > 0}
		<div class="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter op map">
			<Button size="sm" variant={filter === '' ? 'primary' : 'secondary'} aria-pressed={filter === ''} onclick={() => (filter = '')}>Alles ({sets.length})</Button>
			{#each folders as name (name)}
				<Button size="sm" variant={filter === name ? 'primary' : 'secondary'} aria-pressed={filter === name} onclick={() => (filter = name)}>{name} ({sets.filter((s) => s.folder?.trim() === name).length})</Button>
			{/each}
			{#if hasUnfiled}<Button size="sm" variant={filter === NO_FOLDER ? 'primary' : 'secondary'} aria-pressed={filter === NO_FOLDER} onclick={() => (filter = NO_FOLDER)}>Zonder map</Button>{/if}
		</div>
	{/if}

	{#if selecting}
		<div class="sticky top-0 z-20 -mx-4 mb-4 flex flex-wrap items-center gap-3 bg-bg/90 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8" role="region" aria-label="Acties voor geselecteerde sets">
			<p class="min-w-0 flex-1 font-heading text-lg font-semibold" aria-live="polite">{selected.length} {selected.length === 1 ? 'set' : 'sets'} geselecteerd</p>
			<Button variant="ghost" size="sm" onclick={() => (selected = selected.length === visible.length ? [] : visible.map((s) => s.id))}>{selected.length === visible.length ? 'Niets selecteren' : 'Alles selecteren'}</Button>
			<Button variant="secondary" size="sm" disabled={selected.length === 0} onclick={openMove}><Icon name="layers" size={16} /> Naar map…</Button>
			<Button variant="danger" size="sm" disabled={selected.length === 0} onclick={() => (deleteOpen = true)}><Icon name="trash" size={16} /> Verwijderen</Button>
		</div>
	{/if}

	{#each groups as group (group.name)}
		<section class="mb-6">
			{#if group.name}<h2 class="mb-3 font-heading text-xl font-semibold text-text-muted">{group.name}</h2>{/if}
			<ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{#each group.sets as set (set.id)}
					{@const picked = selected.includes(set.id)}
					<li>
						<Card class={['relative flex h-full flex-col gap-3 hover:bg-surface-2', picked && 'ring-2 ring-primary']}>
							<div class="flex min-w-0 items-start gap-3">
								{#if selecting}
									<span class={['mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border-2', picked ? 'border-primary bg-primary text-on-accent' : 'border-border bg-surface']} aria-hidden="true">
										{#if picked}<Icon name="check" size={16} />{/if}
									</span>
								{/if}
								<div class="min-w-0 flex-1">
									<h2 class="truncate font-heading text-lg font-semibold">
										{#if selecting}
											<!-- In organising mode the whole card toggles the selection instead of opening the set. -->
											<button type="button" aria-pressed={picked} class="text-left after:absolute after:inset-0 after:content-['']" onclick={() => toggle(set.id)}>{set.title}</button>
										{:else}
											<!-- The whole card is clickable through this link. -->
											<a href="/sets/{set.id}" class="after:absolute after:inset-0 after:content-['']">{set.title}</a>
										{/if}
									</h2>
									<p class="truncate text-sm text-text-muted">
										{set.subject}{set.folder ? ` · ${set.folder}` : ''}
									</p>
									<p class="mt-1 text-sm text-text-muted">{set.listCount} {set.listCount === 1 ? 'lijst' : 'lijsten'} · {set.rowCount} {set.rowCount === 1 ? 'rij' : 'rijen'}</p>
								</div>
							</div>
							{#if !selecting}
								<div class="relative z-10 mt-auto flex flex-wrap gap-2">
									<PracticeMenu href="/sets/{set.id}/practice" size="sm" />
								</div>
							{/if}
						</Card>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
{/if}

<CardImportModal bind:open={importOpen} />

<Modal bind:open={moveOpen} title="Naar map verplaatsen">
	<fieldset class="flex flex-col gap-2">
		<legend class="mb-2 text-text-muted">{selected.length} {selected.length === 1 ? 'set' : 'sets'} verplaatsen naar:</legend>
		{#each folders as name (name)}
			<label class="flex items-center gap-2"><input type="radio" name="move-folder" value={name} bind:group={moveChoice} /> {name}</label>
		{/each}
		<label class="flex items-center gap-2"><input type="radio" name="move-folder" value={NO_FOLDER} bind:group={moveChoice} /> Zonder map</label>
		<label class="flex items-center gap-2"><input type="radio" name="move-folder" value={'\u0001new'} bind:group={moveChoice} /> Nieuwe map:</label>
		<input class="input" bind:value={newFolder} maxlength="60" placeholder="bijv. Hoofdstuk 3" aria-label="Naam van de nieuwe map" disabled={moveChoice !== '\u0001new'} />
	</fieldset>
	{#snippet actions()}
		<Button variant="ghost" onclick={() => (moveOpen = false)}>Annuleren</Button>
		<Button disabled={busy || (moveChoice === '\u0001new' && newFolder.trim() === '')} onclick={applyMove} class="min-w-32">{busy ? 'Bezig…' : 'Verplaatsen'}</Button>
	{/snippet}
</Modal>

<Modal bind:open={deleteOpen} title="Sets verwijderen?">
	<p>{selected.length} {selected.length === 1 ? 'set' : 'sets'} en je voortgang daarop worden verwijderd. Dit kan niet ongedaan gemaakt worden.</p>
	{#snippet actions()}
		<Button variant="ghost" onclick={() => (deleteOpen = false)}>Annuleren</Button>
		<Button variant="danger" disabled={busy} onclick={applyDelete} class="min-w-32">{busy ? 'Bezig…' : 'Verwijderen'}</Button>
	{/snippet}
</Modal>
