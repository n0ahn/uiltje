<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
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
	import ChallengeModal from '#lib/components/social/ChallengeModal.svelte';
	import ShareModal from '#lib/components/social/ShareModal.svelte';
	import SetPageSkeleton from '#lib/components/skeleton/SetPageSkeleton.svelte';
	import ProgressBar from '#lib/components/ui/ProgressBar.svelte';
	import Segmented from '#lib/components/ui/Segmented.svelte';
	import { rowKey } from '#lib/engine/stages.js';
	import { downloadSetJson } from '#lib/editor/json.js';
	import { isWordKind, type StudyList, type StudyRow, type StudySet } from '#lib/schema/types.js';
	import { auth } from '#lib/state/auth.svelte.js';
	import { getSocial } from '#lib/social/index.js';
	import { toasts } from '#lib/state/toast.svelte.js';
	import { getStorage } from '#lib/storage/index.js';
	import type { ProgressMap } from '#lib/storage/adapter.js';
	import { saveSelection } from '#lib/utils/selection.js';

	// The page of one set: look at everything first, then practise or edit (like StudyGo).
	// Lists can be shown per list or grouped by how well you know them, and single terms can be picked to practise only those.
	const storage = getStorage();
	let set = $state<StudySet | null>(null);
	let progress = $state<ProgressMap>({});
	let missing = $state(false);
	let confirmOpen = $state(false);
	let shareOpen = $state(false);
	let challengeOpen = $state(false);
	let showAll = $state<Record<string, boolean>>({});
	// Visible to friends? null = unknown (guest, offline); accounts load it once.
	let isPublic = $state<boolean | null>(null);
	$effect(() => {
		const id = set?.id;
		if (id && auth.client && auth.user) {
			untrack(() => {
				getSocial()
					.getVisibility(id)
					.then((value) => (isPublic = value))
					.catch(() => (isPublic = null));
			});
		}
	});
	async function toggleVisibility() {
		if (!set || isPublic === null) return;
		const next = !isPublic;
		try {
			await getSocial().setVisibility(set.id, next);
			isPublic = next;
			toasts.show(next ? 'Je vrienden kunnen deze set nu zien en kopiëren' : 'Deze set is nu privé');
		} catch {
			toasts.show('Zichtbaarheid aanpassen is niet gelukt');
		}
	}
	let view = $state<'lists' | 'mastery'>('lists');
	let selecting = $state(false);
	const picked = new SvelteSet<string>();

	const PREVIEW = 10;
	const VIEWS = [
		{ id: 'lists', name: 'Per lijst' },
		{ id: 'mastery', name: 'Op beheersing' }
	] as const;

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
	const onlyConcepts = $derived(!!set && set.lists.length > 0 && set.lists.every((l) => l.kind === 'concept'));
	const onlyWords = $derived(!!set && set.lists.length > 0 && set.lists.every((l) => isWordKind(l.kind)));
	const unit = $derived(onlyConcepts ? 'termen' : onlyWords ? 'woorden' : 'vormen');

	// ---- Mastery: how well do you know a row? (rule from NOTES: onder de knie = two unaided correct answers in a row)
	type Mastery = 'hard' | 'learning' | 'new' | 'known';
	const MASTERY: { id: Mastery; name: string; text: string; dot: string }[] = [
		{ id: 'hard', name: 'Lastig', text: 'Vaker fout dan goed', dot: 'bg-flame' },
		{ id: 'learning', name: 'Bezig', text: 'Je bent ermee bezig', dot: 'bg-wheat' },
		{ id: 'new', name: 'Nog niet geoefend', text: 'Nog niet gezien', dot: 'bg-border' },
		{ id: 'known', name: 'Onder de knie', text: 'Twee keer goed op rij', dot: 'bg-sage' }
	];

	function masteryOf(listId: string, rowId: string): Mastery {
		const p = progress[rowKey(set?.id ?? '', listId, rowId)];
		if (!p || p.correct + p.wrong + p.assisted === 0) return 'new';
		if (p.streak >= 2) return 'known';
		return p.wrong > 0 && p.wrong >= p.correct ? 'hard' : 'learning';
	}

	type Entry = { list: StudyList; row: StudyRow; key: string };
	const entries = $derived<Entry[]>(set ? set.lists.flatMap((list) => list.rows.map((row) => ({ list, row, key: rowKey(set!.id, list.id, row.id) }))) : []);
	const byMastery = $derived(
		MASTERY.map((m) => ({ ...m, entries: entries.filter((e) => masteryOf(e.list.id, e.row.id) === m.id) })).filter((g) => g.entries.length > 0)
	);
	const countOf = (m: Mastery) => byMastery.find((g) => g.id === m)?.entries.length ?? 0;

	// ---- Layout: lists with long text (stijlfiguren, definitions) take the full width; short ones stay in two columns.
	const textOf = (row: StudyRow) => Math.max(row.prompt.length, row.answers.join(' / ').length);
	function isWide(list: StudyList): boolean {
		if (list.kind === 'concept') return true;
		const sample = list.rows.slice(0, 30);
		return sample.length > 0 && sample.reduce((n, r) => n + textOf(r), 0) / sample.length > 45;
	}
	const anyWide = $derived(!!set && set.lists.some(isWide));
	// Concept lists read "term, then explanation" here (the practice direction is separate).
	const swapped = (list: StudyList) => list.kind === 'concept';

	const COLS = {
		normal: 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]',
		wide: 'grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]',
		normalPick: 'grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto]',
		widePick: 'grid-cols-[auto_minmax(0,1fr)_minmax(0,2fr)_auto]'
	} as const;
	const colsFor = (wide: boolean) => (selecting ? (wide ? COLS.widePick : COLS.normalPick) : wide ? COLS.wide : COLS.normal);

	// ---- Picking terms to practise
	const keysOf = (list: Entry[]) => list.map((e) => e.key);
	const allKeys = $derived(keysOf(entries));
	function toggleKey(key: string) {
		if (picked.has(key)) picked.delete(key);
		else picked.add(key);
	}
	function setPicked(keys: string[]) {
		picked.clear();
		for (const key of keys) picked.add(key);
	}
	function toggleMany(keys: string[]) {
		const all = keys.every((k) => picked.has(k));
		for (const key of keys) {
			if (all) picked.delete(key);
			else picked.add(key);
		}
	}
	function startSelecting() {
		selecting = true;
	}
	function stopSelecting() {
		selecting = false;
		picked.clear();
	}
	const rememberPicked = () => set && saveSelection(set.id, [...picked]);

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

<!-- One row of a list. In "pick" mode the whole row is a label around a checkbox. -->
{#snippet cells(list: StudyList, row: StudyRow, showList: boolean)}
	{@const left = swapped(list) ? row.answers.join(' / ') : row.prompt}
	{@const right = swapped(list) ? row.prompt : row.answers.join(' / ')}
	<span class="min-w-0 wrap-break-word">
		{#if showList}<span class="mb-0.5 block truncate text-xs font-semibold text-text-muted">{list.title}</span>{/if}
		<span class={swapped(list) ? 'font-semibold' : ''}>{left}</span>
	</span>
	<span class="min-w-0 wrap-break-word">{right}</span>
	<span
		class={['size-2.5 rounded-full', known(list.id, row.id) ? 'bg-sage' : 'bg-border']}
		role="img"
		aria-label={known(list.id, row.id) ? 'Onder de knie' : 'Nog niet onder de knie'}
	></span>
	{#if row.tip}
		<span class="col-span-full mt-1.5 flex items-start gap-2 text-sm text-text-muted"><Icon name="bulb" size={16} class="mt-0.5 shrink-0" /> {row.tip}</span>
	{/if}
{/snippet}

{#snippet rowItem(list: StudyList, row: StudyRow, wide: boolean, showList: boolean)}
	{@const key = rowKey(set?.id ?? '', list.id, row.id)}
	<li>
		{#if selecting}
			<label class={['grid cursor-pointer items-center gap-x-4 rounded-tile px-3 py-2 has-focus-visible:outline-3 has-focus-visible:outline-primary/50', colsFor(wide), picked.has(key) ? 'bg-primary-soft' : 'bg-surface-2 hover:bg-surface']}>
				<input type="checkbox" class="size-5 accent-primary" checked={picked.has(key)} onchange={() => toggleKey(key)} aria-label="Kies {swapped(list) ? row.answers[0] : row.prompt}" />
				{@render cells(list, row, showList)}
			</label>
		{:else}
			<div class={['grid items-center gap-x-4 rounded-tile bg-surface-2 px-3 py-2', colsFor(wide)]}>
				{@render cells(list, row, showList)}
			</div>
		{/if}
	</li>
{/snippet}

{#snippet header(list: StudyList)}
	<div class={['grid gap-x-4 text-sm font-semibold text-text-muted', colsFor(isWide(list))]}>
		{#if selecting}<span class="w-5"></span>{/if}
		<span>{swapped(list) ? list.columns.answer : list.columns.prompt}</span><span>{swapped(list) ? list.columns.prompt : list.columns.answer}</span><span class="sr-only">Status</span>
	</div>
{/snippet}

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
				{#if isPublic}<span class="mr-1 inline-flex items-center gap-1 rounded-full bg-sage-soft px-2 py-0.5 align-middle text-xs font-semibold text-text"><Icon name="eye" size={14} /> Openbaar</span>{/if}
				{set.subject}{set.folder ? ` · ${set.folder}` : ''} · {set.lists.length}
				{onlyWords ? (set.lists.length === 1 ? 'lijst' : 'lijsten') : set.lists.length === 1 ? 'rijtje' : 'rijtjes'} · {rowTotal}
				{onlyWords ? (onlyConcepts ? (rowTotal === 1 ? 'begrip' : 'begrippen') : rowTotal === 1 ? 'woord' : 'woorden') : rowTotal === 1 ? 'vorm' : 'vormen'}
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<PracticeMenu href="/sets/{set.id}/practice" disabled={rowTotal === 0} explain={set.lists.some((l) => l.kind === 'concept' && l.rows.length > 0)} />
			<Button href="/sets/{set.id}/edit" variant="secondary" size="lg"><Icon name="pencil" size={18} /> Bewerken</Button>
			<Dropdown label="Meer acties" variant="ghost" size="lg" iconOnly align="right">
				{#snippet trigger()}<Icon name="more" size={22} />{/snippet}
				{#if isPublic !== null}
					<MenuItem icon={isPublic ? 'eye-off' : 'eye'} onclick={toggleVisibility}>{isPublic ? 'Privé maken' : 'Zichtbaar voor vrienden'}</MenuItem>
				{/if}
				<MenuItem icon="share" onclick={() => (shareOpen = true)}>Delen…</MenuItem>
				<MenuItem icon="trophy" onclick={() => (challengeOpen = true)}>Vriend uitdagen…</MenuItem>
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

			<!-- How to look at the lists, and picking terms to practise. -->
			<div class="flex flex-wrap items-center gap-3">
				<div class="w-full max-w-sm"><Segmented legend="Groeperen" hideLegend options={VIEWS} bind:value={view} /></div>
				<div class="ml-auto">
					{#if selecting}
						<Button variant="secondary" onclick={stopSelecting}><Icon name="x" size={18} /> Stoppen met kiezen</Button>
					{:else}
						<Button variant="secondary" onclick={startSelecting}><Icon name="check" size={18} /> {unit === 'termen' ? 'Termen' : unit === 'woorden' ? 'Woorden' : 'Vormen'} kiezen</Button>
					{/if}
				</div>
			</div>
		{/if}

		{#if selecting}
			<div class="sticky top-0 z-20 -mx-4 flex flex-wrap items-center gap-2 bg-bg/90 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8" role="region" aria-label="Acties voor gekozen {unit}">
				<p class="mr-auto font-heading text-lg font-semibold" aria-live="polite">{picked.size === 0 ? `Vink ${unit} aan om te oefenen` : `${picked.size} van ${rowTotal} gekozen`}</p>
				<Button variant="ghost" size="sm" onclick={() => setPicked(picked.size === rowTotal ? [] : allKeys)}>{picked.size === rowTotal ? 'Niets' : 'Alles'}</Button>
				{#if countOf('hard') > 0}
					<Button variant="ghost" size="sm" onclick={() => setPicked(keysOf(byMastery.find((g) => g.id === 'hard')?.entries ?? []))}>Lastige ({countOf('hard')})</Button>
				{/if}
				{#if rowTotal - countOf('known') > 0 && countOf('known') > 0}
					<Button variant="ghost" size="sm" onclick={() => setPicked(keysOf(entries.filter((e) => masteryOf(e.list.id, e.row.id) !== 'known')))}>Nog niet onder de knie ({rowTotal - countOf('known')})</Button>
				{/if}
				<PracticeMenu href="/sets/{set.id}/practice" extra="&selection=1" size="md" label="Oefen selectie" disabled={picked.size === 0} onbeforestart={rememberPicked} />
			</div>
		{/if}

		{#if view === 'lists'}
			<div class="grid items-start gap-5 xl:grid-cols-2">
				{#each set.lists as list (list.id)}
					{@const wide = isWide(list)}
					{@const shown = showAll[list.id] ? list.rows : list.rows.slice(0, PREVIEW)}
					{@const keys = list.rows.map((r) => rowKey(set!.id, list.id, r.id))}
					<Card class={['flex flex-col gap-3', wide && 'xl:col-span-2']}>
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<h2 class="font-heading text-lg font-semibold">{list.title}</h2>
								{#if list.group}<p class="text-sm text-text-muted">{list.group}</p>{/if}
							</div>
							{#if selecting && list.rows.length > 0}
								<Button variant="ghost" size="sm" onclick={() => toggleMany(keys)}>{keys.every((k) => picked.has(k)) ? 'Niets' : 'Alles'} in lijst</Button>
							{/if}
						</div>
						{#if list.rows.length === 0}
							<p class="text-sm text-text-muted">Deze lijst is nog leeg.</p>
						{:else}
							{@render header(list)}
							<ul class="flex flex-col gap-1.5">
								{#each shown as row (row.id)}
									{@render rowItem(list, row, wide, false)}
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
		{:else}
			<!-- Grouped by how well you know them: the hardest first. -->
			<div class="grid items-start gap-5 xl:grid-cols-2">
				{#each byMastery as group (group.id)}
					{@const shown = showAll[group.id] ? group.entries : group.entries.slice(0, PREVIEW)}
					{@const keys = keysOf(group.entries)}
					<Card class={['flex flex-col gap-3', anyWide && 'xl:col-span-2']}>
						<div class="flex flex-wrap items-center justify-between gap-3">
							<div class="flex min-w-0 items-center gap-3">
								<span class={['size-3 shrink-0 rounded-full', group.dot]} aria-hidden="true"></span>
								<div class="min-w-0">
									<h2 class="font-heading text-lg font-semibold">{group.name} <span class="text-text-muted">({group.entries.length})</span></h2>
									<p class="text-sm text-text-muted">{group.text}</p>
								</div>
							</div>
							{#if selecting}
								<Button variant="ghost" size="sm" onclick={() => toggleMany(keys)}>{keys.every((k) => picked.has(k)) ? 'Niets' : 'Alles'} in deze groep</Button>
							{:else}
								<PracticeMenu href="/sets/{set.id}/practice" extra="&selection=1" size="sm" label="Oefen deze" onbeforestart={() => set && saveSelection(set.id, keys)} />
							{/if}
						</div>
						<ul class="flex flex-col gap-1.5">
							{#each shown as entry (entry.key)}
								{@render rowItem(entry.list, entry.row, anyWide, set.lists.length > 1)}
							{/each}
						</ul>
						{#if group.entries.length > PREVIEW}
							<div>
								<Button variant="ghost" size="sm" onclick={() => (showAll[group.id] = !showAll[group.id])}>
									{showAll[group.id] ? 'Minder tonen' : `Alle ${group.entries.length} tonen`}
								</Button>
							</div>
						{/if}
					</Card>
				{/each}
			</div>
		{/if}
	</div>

	<ShareModal bind:open={shareOpen} setId={set.id} title={set.title} />
	<ChallengeModal bind:open={challengeOpen} setId={set.id} title={set.title} rowCount={rowTotal} />

	<Modal bind:open={confirmOpen} title="Set verwijderen?">
		<p>"{set.title}" en je voortgang daarop worden verwijderd. Dit kan niet ongedaan gemaakt worden.</p>
		{#snippet actions()}
			<Button variant="ghost" onclick={() => (confirmOpen = false)}>Annuleren</Button>
			<Button variant="danger" onclick={remove}>Verwijderen</Button>
		{/snippet}
	</Modal>
{/if}
