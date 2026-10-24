<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import PracticeMenu from '../practice/PracticeMenu.svelte';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Dropdown from '../ui/Dropdown.svelte';
	import Icon from '../ui/Icon.svelte';
	import MenuItem from '../ui/MenuItem.svelte';
	import Modal from '../ui/Modal.svelte';
	import Owl from '../ui/Owl.svelte';
	import OptionGroup from '../ui/OptionGroup.svelte';
	import SelectMenu from '../ui/SelectMenu.svelte';
	import CardGridSkeleton from '../skeleton/CardGridSkeleton.svelte';
	import { auth } from '../../state/auth.svelte';
	import { getSocial } from '../../social';
	import { toasts } from '../../state/toast.svelte';
	import { getStorage } from '../../storage';
	import type { SetSummary } from '../../storage/adapter';
	import { sameSubject, subjectSlug } from '../../utils/subject';


	// The overview of sets with everything for finding and ordering them: search, groups (folders), sort, filter by folder,
	// organising (move to a folder, delete) and the card menus. Used by /sets (all sets) and by the page of a subject
	// (/vak/<vak>, only the sets of that subject), so both behave exactly the same.
	type Props = {
		/** Only show the sets of this subject; null = all sets. */
		subject?: string | null;
		/** Organising mode. The page puts the "Ordenen" / "Klaar" buttons in its own header and binds this. */
		selecting?: boolean;
		/** Number of sets shown (null while loading), for the page header. */
		total?: number | null;
		/** The subject as it is written on the sets (subject mode), for the page title. */
		subjectName?: string;
	};
	let { subject = null, selecting = $bindable(false), total = $bindable(null), subjectName = $bindable('') }: Props = $props();

	const storage = getStorage();
	let sets = $state<SetSummary[] | null>(null);
	// Sets your friends can see (accounts only). Empty for guests or while it loads.
	let publicIds = $state<string[]>([]);

	async function loadVisibility() {
		try {
			publicIds = await getSocial().listPublicSetIds();
		} catch {
			publicIds = []; // guests, offline or an older database: no chips
		}
	}
	$effect(() => {
		if (auth.client && auth.user) untrack(() => void loadVisibility());
	});

	async function toggleVisibility(id: string, title: string) {
		const makePublic = !publicIds.includes(id);
		try {
			await getSocial().setVisibility(id, makePublic);
			publicIds = makePublic ? [...publicIds, id] : publicIds.filter((p) => p !== id);
			toasts.show(makePublic ? `"${title}" is nu zichtbaar voor je vrienden` : `"${title}" is nu privé`);
		} catch {
			toasts.show('Zichtbaarheid aanpassen is niet gelukt');
		}
	}

	// Finding and ordering: search, group by folder or subject, sort.
	type GroupBy = 'folder' | 'subject' | 'none';
	let query = $state('');
	const ALL_GROUP_OPTIONS: { id: GroupBy; name: string }[] = [
		{ id: 'folder', name: 'Op map' },
		{ id: 'subject', name: 'Op vak' },
		{ id: 'none', name: 'Niet' }
	];
	// Inside one subject grouping by subject makes no sense: the groups are the folders.
	const GROUP_OPTIONS = $derived(subject === null ? ALL_GROUP_OPTIONS : ALL_GROUP_OPTIONS.filter((o) => o.id !== 'subject'));
	const SORT_OPTIONS: { id: 'recent' | 'name'; name: string }[] = [
		{ id: 'recent', name: 'Laatst gewijzigd' },
		{ id: 'name', name: 'Naam' }
	];
	let groupBy = $state<GroupBy>('folder');
	let sort = $state<'recent' | 'name'>('recent');

	// Organising: pick sets, then move them to a folder or delete them.
	const NO_FOLDER = '\u0000none';
	const NEW_FOLDER = '\u0001new';
	let filter = $state<string>('');
	let selected = $state<string[]>([]);
	let moveOpen = $state(false);
	let moveChoice = $state<string>(NO_FOLDER);
	let newFolder = $state('');
	let deleteOpen = $state(false);
	let busy = $state(false);

	const folderOf = (s: SetSummary) => s.folder?.trim() ?? '';
	const folders = $derived([...new Set((sets ?? []).map(folderOf).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'nl')));
	const moveOptions = $derived([
		...folders.map((name) => ({ id: name, name })),
		{ id: NO_FOLDER, name: 'Zonder map' },
		{ id: NEW_FOLDER, name: 'Nieuwe map…' }
	]);
	const hasUnfiled = $derived((sets ?? []).some((s) => folderOf(s) === ''));
	/** Practise the sets of one folder (or the sets without a folder) together: on /sets across subjects, on a subject page within it. */
	const folderHref = (name: string) =>
		`${subject === null ? '/sets/practice' : `/vak/${subjectSlug(subjectName || subject)}/practice`}?${name === 'Zonder map' || name === NO_FOLDER ? 'nomap=1' : `map=${encodeURIComponent(name)}`}`;
	const needle = $derived(query.trim().toLowerCase());
	const visible = $derived(
		(sets ?? [])
			.filter((s) => (filter === '' ? true : filter === NO_FOLDER ? folderOf(s) === '' : folderOf(s) === filter))
			.filter((s) => needle === '' || `${s.title} ${s.subject} ${s.folder ?? ''}`.toLowerCase().includes(needle))
			.sort((a, b) => (sort === 'name' ? a.title.localeCompare(b.title, 'nl') : b.updatedAt - a.updatedAt))
	);
	type Group = { name: string; sets: SetSummary[] };
	// Headings only appear when there is something to separate.
	const groups = $derived.by((): Group[] => {
		if (groupBy === 'subject') {
			const names = [...new Set(visible.map((s) => s.subject.trim() || 'Zonder vak'))].sort((a, b) => a.localeCompare(b, 'nl'));
			return names.map((name) => ({ name, sets: visible.filter((s) => (s.subject.trim() || 'Zonder vak') === name) }));
		}
		if (groupBy === 'none' || filter !== '' || folders.length === 0) return [{ name: '', sets: visible }];
		const list = folders.map((name) => ({ name, sets: visible.filter((s) => folderOf(s) === name) })).filter((g) => g.sets.length > 0);
		const loose = visible.filter((s) => folderOf(s) === '');
		return loose.length > 0 ? [...list, { name: 'Zonder map', sets: loose }] : list;
	});

	async function load() {
		const all = await storage.listSets();
		sets = subject === null ? all : all.filter((s) => sameSubject(s.subject, subject));
		total = sets.length;
		subjectName = sets[0]?.subject.trim() ?? '';
		const ids = new Set(sets.map((s) => s.id));
		selected = selected.filter((id) => ids.has(id));
		if (filter !== '' && filter !== NO_FOLDER && !folders.includes(filter)) filter = '';
	}
	onMount(() => void load());

	function toggle(id: string) {
		selected = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
	}

	function toggleGroup(group: Group) {
		const ids = group.sets.map((s) => s.id);
		const all = ids.every((id) => selected.includes(id));
		selected = all ? selected.filter((id) => !ids.includes(id)) : [...new Set([...selected, ...ids])];
	}

	/** The ⋮ menu of one card: act on that single set, without entering organising mode. */
	function moveOne(id: string) {
		selected = [id];
		openMove();
	}
	function deleteOne(id: string) {
		selected = [id];
		deleteOpen = true;
	}

	/** A single set picked from its ⋮ menu is only remembered while its dialog is open. */
	function forgetSingle() {
		if (!selecting && !busy) selected = [];
	}

	/** Leave organising mode (the page calls this from its "Klaar" button). */
	export function stopSelecting() {
		selecting = false;
		selected = [];
	}

	function openMove() {
		moveChoice = folders[0] ?? NO_FOLDER;
		newFolder = '';
		moveOpen = true;
	}

	async function applyMove() {
		const folder = moveChoice === NEW_FOLDER ? newFolder.trim() : moveChoice === NO_FOLDER ? '' : moveChoice;
		if (moveChoice === NEW_FOLDER && folder === '') return;
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

{#if sets === null}
	<CardGridSkeleton />
{:else if sets.length === 0 && subject !== null}
	<div class="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
		<Owl pose="sleepy" size={96} />
		<h2 class="font-heading text-2xl font-semibold">Geen sets voor dit vak</h2>
		<p class="text-text-muted">Maak een set en kies “{subject}” als vak.</p>
		<Button href="/sets/new">Nieuwe set</Button>
	</div>
{:else if sets.length === 0}
	<div class="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
		<Owl pose="idle" size={96} />
		<h2 class="font-heading text-2xl font-semibold">Nog geen sets</h2>
		<p class="text-text-muted">Maak je eerste set met een sjabloon, laat de AI hem maken, of importeer er een uit Quizlet of StudyGo.</p>
		<div class="flex flex-wrap justify-center gap-3">
			<Button href="/sets/new">Eerste set maken</Button>
			<Button href="/sets/ai" variant="secondary"><Icon name="sparkles" size={18} /> Met AI</Button>
			<Button href="/bibliotheek" variant="secondary"><Icon name="cards" size={18} /> Kant en klaar</Button>
		</div>
	</div>
{:else}
	<!-- Find and order: search, group, sort. -->
	{#if sets.length > 3}
		<div class="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
			<label class="relative block">
				<span class="sr-only">Zoek in je sets</span>
				<Icon name="search" size={18} class="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-text-muted" />
				<input class="input pl-11" type="search" bind:value={query} placeholder={subject === null ? 'Zoek op titel, vak of map' : 'Zoek op titel of map'} />
			</label>
			<SelectMenu label="Groeperen" options={GROUP_OPTIONS} bind:value={groupBy} />
			<SelectMenu label="Sorteren" options={SORT_OPTIONS} bind:value={sort} align="right" />
		</div>
	{/if}

	{#if folders.length > 0}
		<div class="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter op map">
			<Button size="sm" variant={filter === '' ? 'primary' : 'secondary'} aria-pressed={filter === ''} onclick={() => (filter = '')}>Alles ({sets.length})</Button>
			{#each folders as name (name)}
				<Button size="sm" variant={filter === name ? 'primary' : 'secondary'} aria-pressed={filter === name} onclick={() => (filter = name)}><Icon name="folder" size={16} /> {name} ({sets.filter((s) => folderOf(s) === name).length})</Button>
			{/each}
			{#if filter !== '' && !selecting}<Button href={folderHref(filter)} variant="ghost" size="sm" class="ml-auto"><Icon name="play" size={16} /> Oefen {filter === NO_FOLDER ? 'deze sets' : 'deze map'}</Button>{/if}
			{#if hasUnfiled}<Button size="sm" variant={filter === NO_FOLDER ? 'primary' : 'secondary'} aria-pressed={filter === NO_FOLDER} onclick={() => (filter = NO_FOLDER)}>Zonder map</Button>{/if}
		</div>
	{/if}

	{#if selecting}
		<div class="sticky top-0 z-20 -mx-4 mb-4 flex flex-wrap items-center gap-3 bg-bg/90 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8" role="region" aria-label="Acties voor geselecteerde sets">
			<p class="min-w-0 flex-1 font-heading text-lg font-semibold" aria-live="polite">{selected.length === 0 ? 'Kies sets om te ordenen' : `${selected.length} ${selected.length === 1 ? 'set' : 'sets'} geselecteerd`}</p>
			<Button variant="ghost" size="sm" onclick={() => (selected = selected.length === visible.length ? [] : visible.map((s) => s.id))}>{selected.length === visible.length && visible.length > 0 ? 'Niets selecteren' : 'Alles selecteren'}</Button>
			<Button variant="secondary" size="sm" disabled={selected.length === 0} onclick={openMove}><Icon name="folder" size={16} /> Naar map…</Button>
			<Button variant="danger" size="sm" disabled={selected.length === 0} onclick={() => (deleteOpen = true)}><Icon name="trash" size={16} /> Verwijderen</Button>
		</div>
	{/if}

	{#if visible.length === 0}
		<div class="flex flex-col items-center gap-3 py-12 text-center">
			<p class="text-text-muted">Geen sets gevonden{needle ? ` voor “${query.trim()}”` : ''}.</p>
			<Button variant="secondary" size="sm" onclick={() => { query = ''; filter = ''; }}>Filters wissen</Button>
		</div>
	{/if}

	{#each groups as group (group.name)}
		<section class="mb-6">
			{#if group.name}
				<div class="mb-3 flex items-center gap-3">
					<h2 class="flex min-w-0 items-center gap-2 font-heading text-xl font-semibold text-text-muted">
						{#if groupBy === 'folder' && group.name !== 'Zonder map'}<Icon name="folder" size={20} />{/if}
						<span class="truncate">{group.name}</span>
						<span class="text-base font-semibold">({group.sets.length})</span>
					</h2>
					{#if groupBy === 'folder' && !selecting}
						<Button href={folderHref(group.name)} variant="ghost" size="sm"><Icon name="play" size={16} /> Oefen {group.name === 'Zonder map' ? 'deze sets' : 'deze map'}</Button>
					{/if}
					{#if selecting}
						<Button variant="ghost" size="sm" onclick={() => toggleGroup(group)}>{group.sets.every((s) => selected.includes(s.id)) ? 'Niets' : 'Alles'} in {groupBy === 'subject' ? 'dit vak' : 'deze map'}</Button>
					{/if}
				</div>
			{/if}
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
									<p class="flex items-center gap-2 text-sm text-text-muted">
										<span class="min-w-0 truncate">{subject === null ? set.subject : ''}{groupBy !== 'folder' && set.folder ? `${subject === null ? ' · ' : ''}${set.folder}` : ''}</span>
										{#if publicIds.includes(set.id)}
											<span class="inline-flex shrink-0 items-center gap-1 rounded-full bg-sage-soft px-2 py-0.5 text-xs font-semibold text-text" title="Je vrienden kunnen deze set zien en kopiëren"><Icon name="eye" size={14} /> Openbaar</span>
										{/if}
									</p>
									<p class="mt-1 text-sm text-text-muted">{set.listCount} {set.listCount === 1 ? 'lijst' : 'lijsten'} · {set.rowCount} {set.rowCount === 1 ? 'rij' : 'rijen'}</p>
								</div>
							</div>
							{#if !selecting}
								<div class="relative z-10 mt-auto flex items-center gap-2">
									<PracticeMenu href="/sets/{set.id}/practice" size="sm" disabled={set.rowCount === 0} />
									<div class="ml-auto">
										<Dropdown label="Meer acties voor {set.title}" variant="ghost" size="sm" iconOnly align="right">
											{#snippet trigger()}<Icon name="more" size={20} />{/snippet}
											<MenuItem icon="pencil" href="/sets/{set.id}/edit">Bewerken</MenuItem>
											<MenuItem icon="folder" onclick={() => moveOne(set.id)}>Naar map…</MenuItem>
											{#if auth.user}
												<MenuItem icon={publicIds.includes(set.id) ? 'eye-off' : 'eye'} onclick={() => toggleVisibility(set.id, set.title)}>{publicIds.includes(set.id) ? 'Privé maken' : 'Zichtbaar voor vrienden'}</MenuItem>
											{/if}
											<MenuItem icon="trash" danger onclick={() => deleteOne(set.id)}>Verwijderen</MenuItem>
										</Dropdown>
									</div>
								</div>
							{/if}
						</Card>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
{/if}

<Modal bind:open={moveOpen} title="Naar map verplaatsen" onclose={forgetSingle}>
	<OptionGroup legend="{selected.length} {selected.length === 1 ? 'set' : 'sets'} verplaatsen naar" options={moveOptions} bind:value={moveChoice} cols={2} />
	{#if moveChoice === NEW_FOLDER}
		<input class="input mt-3" bind:value={newFolder} maxlength="60" placeholder="bijv. Hoofdstuk 3" aria-label="Naam van de nieuwe map" />
	{/if}
	{#snippet actions()}
		<Button variant="ghost" onclick={() => (moveOpen = false)}>Annuleren</Button>
		<Button disabled={busy || (moveChoice === NEW_FOLDER && newFolder.trim() === '')} onclick={applyMove} class="min-w-32">{busy ? 'Bezig…' : 'Verplaatsen'}</Button>
	{/snippet}
</Modal>

<Modal bind:open={deleteOpen} title="Sets verwijderen?" onclose={forgetSingle}>
	<p>{selected.length} {selected.length === 1 ? 'set' : 'sets'} en je voortgang daarop worden verwijderd. Dit kan niet ongedaan gemaakt worden.</p>
	{#snippet actions()}
		<Button variant="ghost" onclick={() => (deleteOpen = false)}>Annuleren</Button>
		<Button variant="danger" disabled={busy} onclick={applyDelete} class="min-w-32">{busy ? 'Bezig…' : 'Verwijderen'}</Button>
	{/snippet}
</Modal>
