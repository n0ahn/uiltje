<script lang="ts">
	import EditorSkeleton from '../skeleton/EditorSkeleton.svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { clearDraft, loadDraft, saveDraft } from '../../editor/draft';
	import { toDraft } from '../../editor/json';
	import { EditorState, emptyDraft } from '../../editor/state.svelte';
	import { TEMPLATE_CATEGORIES, type TemplateId } from '../../editor/templates';
	import { getSocial } from '../../social';
	import { auth } from '../../state/auth.svelte';
	import { toasts } from '../../state/toast.svelte';
	import { getStorage } from '../../storage';
	import { StorageError } from '../../storage/adapter';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Dropdown from '../ui/Dropdown.svelte';
	import Icon from '../ui/Icon.svelte';
	import MenuItem from '../ui/MenuItem.svelte';
	import Modal from '../ui/Modal.svelte';
	import Owl from '../ui/Owl.svelte';
	import Segmented from '../ui/Segmented.svelte';
	import JsonModal from './JsonModal.svelte';
	import ListEditor from './ListEditor.svelte';
	import PasteModal from './PasteModal.svelte';

	/** null = new set. */
	type Props = { setId: string | null };
	let { setId }: Props = $props();

	const storage = getStorage();
	// The page is keyed on the set id, so the initial value never goes stale.
	// svelte-ignore state_referenced_locally
	const draftKey = setId ?? 'new';
	const AUTOSAVE_MS = 2000;
	const DEFAULT_SUBJECTS = ['Latijn', 'Grieks', 'Nederlands', 'Engels', 'Frans', 'Duits'];

	let editor = $state<EditorState | null>(null);
	let status = $state<'loading' | 'ready' | 'missing'>('loading');
	let activeId = $state<string | null>(null);
	let issues = $state<string[]>([]);
	let saving = $state(false);
	let subjects = $state<string[]>(DEFAULT_SUBJECTS);
	let folders = $state<string[]>([]);
	// svelte-ignore state_referenced_locally
	let persisted = $state(setId !== null); // exists in storage (so the URL is already /sets/<id>/edit)

	// Public = friends see the set on your profile and can copy it. Kept outside the set JSON, so the schema stays as is.
	// Accounts only: a guest's sets never leave the device.
	const VISIBILITY = [
		{ id: 'private', name: 'Privé', text: 'Alleen jij ziet deze set.' },
		{ id: 'public', name: 'Openbaar', text: 'Je vrienden zien deze set op je profiel en kunnen er een eigen kopie van maken.' }
	] as const;
	let visibility = $state<'private' | 'public'>('private');
	let appliedVisibility: 'private' | 'public' = 'private'; // what is stored

	const KEYBOARDS = [
		{ id: 'default', name: 'Normaal', text: 'Je typt met je eigen toetsenbord.' },
		{ id: 'greek', name: 'Grieks', text: 'Latijnse letters worden meteen Griekse letters (a = α, w = ω, h = η, q = θ, c = χ, y = ψ). Accenten typ je na de letter: \' = ά, ` = ὰ, = = ᾶ, ) = ἀ, ( = ἁ, | = ᾳ.' }
	] as const;

	let pickerOpen = $state(false);
	let pasteOpen = $state(false);
	let pasteListId = $state('');
	let jsonOpen = $state(false);
	let jsonTab = $state<'import' | 'export'>('export');

	onMount(() => {
		void init();
		return () => clearTimeout(timer);
	});

	async function init() {
		const all = await storage.listSets();
		subjects = [...new Set([...DEFAULT_SUBJECTS, ...all.map((s) => s.subject)])];
		folders = [...new Set(all.map((s) => s.folder).filter((f): f is string => !!f))];

		if (auth.user && setId !== null) {
			try {
				visibility = appliedVisibility = (await getSocial().getVisibility(setId)) ? 'public' : 'private';
			} catch {
				// Stays private; the choice is saved with the next save.
			}
		}

		const draft = loadDraft(draftKey);
		if (setId === null) {
			editor = draft ? new EditorState(draft, false) : new EditorState(emptyDraft(), true);
			if (draft) toasts.show('Je laatste concept is hersteld');
		} else {
			const stored = await storage.getSet(setId);
			if (!stored && !draft) {
				status = 'missing';
				return;
			}
			editor = draft ? new EditorState(draft, false) : new EditorState(toDraft(stored!), true);
			if (draft) toasts.show('Je laatste concept is hersteld');
		}
		status = 'ready';
		if (setId === null && page.url.searchParams.has('import')) {
			jsonTab = 'import';
			jsonOpen = true;
		}
	}

	// Greek has no ablative: remove the empty ablative rows of declensions as soon as the set is Greek.
	$effect(() => {
		if (editor?.isGreek) editor.dropAblative();
	});

	// Autosave: 2 seconds after the last change. A complete set is saved; an incomplete one is kept as concept.
	let timer: ReturnType<typeof setTimeout>;
	$effect(() => {
		if (!editor || !editor.dirty) return;
		JSON.stringify(editor.set); // track every edit
		clearTimeout(timer);
		timer = setTimeout(() => void persist(true), AUTOSAVE_MS);
	});

	/** Saves the set. `auto` = the quiet autosave; otherwise it is the Opslaan button. Returns whether the set is stored. */
	async function persist(auto: boolean): Promise<boolean> {
		if (!editor || saving) return false;
		const result = editor.toStudySet();
		if (!result.ok) {
			saveDraft(draftKey, editor.set);
			if (!auto) {
				issues = result.issues;
				toasts.show('Nog niet alles is ingevuld');
			}
			return false;
		}
		saving = true;
		try {
			await storage.saveSet(result.set);
			clearDraft(draftKey);
			editor.markSaved();
			issues = [];
			await applyVisibility(result.set.id);
			if (!auto) return true;
			if (!persisted) {
				persisted = true;
				try {
					await goto(`/sets/${result.set.id}/edit`, { shallow: true, replace: true });
				} catch {
					// URL stays /sets/new; saving again still updates the same set
				}
			}
		} catch (error) {
			toasts.show(error instanceof StorageError ? error.message : 'Opslaan is mislukt');
			saveDraft(draftKey, editor.set);
			return false;
		} finally {
			saving = false;
		}
		return true;
	}

	/** Stores the public/private choice once the set itself is in the account. */
	async function applyVisibility(id: string) {
		if (!auth.user || visibility === appliedVisibility) return;
		const wanted = visibility;
		try {
			await getSocial().setVisibility(id, wanted === 'public');
			appliedVisibility = wanted;
		} catch (error) {
			toasts.show(error instanceof StorageError ? error.message : 'Zichtbaarheid aanpassen is mislukt');
		}
	}

	/** A change of visibility is saved like any other edit: shortly after, together with the set. */
	function onVisibility() {
		clearTimeout(timer);
		timer = setTimeout(() => void persist(true), AUTOSAVE_MS);
	}

	/** The Opslaan button: save, then go to the set page. */
	async function save() {
		if (!editor) return;
		if (await persist(false)) await goto(`/sets/${editor.set.id}`);
	}

	const backHref = $derived(persisted && editor ? `/sets/${editor.set.id}` : '/sets');
	const active = $derived(editor?.set.lists.find((l) => l.id === activeId) ?? editor?.set.lists[0] ?? null);

	const current = $derived.by(() => {
		if (!editor) return null;
		const result = editor.toStudySet();
		return result.ok ? result.set : null;
	});

	function addList(template: TemplateId) {
		activeId = editor?.addList(template) ?? null;
		pickerOpen = false;
	}

	function openPaste(listId: string) {
		pasteListId = listId;
		pasteOpen = true;
	}

	function onImport(set: NonNullable<typeof current>) {
		if (!editor) return;
		editor.replace({ ...toDraft(set), id: editor.set.id });
		toasts.show('Geïmporteerd');
	}
</script>

<svelte:head><title>{setId ? 'Set bewerken' : 'Nieuwe set'} · Uiltje</title></svelte:head>

{#snippet picker()}
	<div class="flex flex-col gap-5">
		{#each TEMPLATE_CATEGORIES as category (category.id)}
			<section aria-labelledby="cat-{category.id}">
				<h3 id="cat-{category.id}" class="font-heading text-lg font-semibold">{category.name}</h3>
				<p class="mb-2 text-sm text-text-muted">{category.description}</p>
				<div class="grid gap-3 sm:grid-cols-3">
					{#each category.templates as template (template.id)}
						<button type="button" class="rounded-card border border-border bg-surface p-4 text-left shadow-card transition duration-150 ease-cozy hover:-translate-y-0.5 hover:border-primary" onclick={() => addList(template.id)}>
							<span class="block font-heading text-lg font-semibold">{template.name}</span>
							<span class="mt-1 block text-sm text-text-muted">{template.description}</span>
							<span class="mt-3 block rounded-tile bg-surface-2 px-3 py-1.5 text-sm font-semibold text-text-muted">{template.example}</span>
						</button>
					{/each}
					{#each category.comingSoon as item (item.name)}
						<div class="rounded-card border border-dashed border-border p-4 text-text-muted" aria-disabled="true">
							<span class="flex items-start justify-between gap-2">
								<span class="font-heading text-lg font-semibold">{item.name}</span>
								<span class="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap">Binnenkort</span>
							</span>
							<span class="mt-1 block text-sm">{item.description}</span>
							<span class="mt-3 block rounded-tile bg-surface-2 px-3 py-1.5 text-sm font-semibold">{item.example}</span>
						</div>
					{/each}
				</div>
			</section>
		{/each}
	</div>
{/snippet}

{#if status === 'loading'}
	<EditorSkeleton />
{:else if status === 'missing' || !editor}
	<div class="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
		<Owl pose="sleepy" size={96} />
		<h1 class="font-heading text-2xl font-semibold">Deze set bestaat niet (meer)</h1>
		<p class="text-text-muted">Misschien is hij verwijderd, of staat hij op een ander apparaat.</p>
		<Button href="/sets">Naar mijn sets</Button>
	</div>
{:else}
	<div class="flex flex-col gap-5">
		<!-- Top bar: where am I, is it saved, save. -->
		<div class="sticky top-0 z-20 -mx-4 flex items-center gap-3 bg-bg/90 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
			<Button href={backHref} variant="ghost" size="sm" iconOnly aria-label="Terug"><Icon name="arrow-left" size={20} /></Button>
			<h1 class="min-w-0 flex-1 truncate font-heading text-xl font-semibold sm:text-2xl">{setId ? 'Set bewerken' : 'Nieuwe set'}</h1>
			<span class="hidden items-center gap-1.5 text-sm text-text-muted sm:inline-flex" role="status">
				{#if saving}Opslaan…{:else if editor.dirty}<span class="size-2 rounded-full bg-flame" aria-hidden="true"></span> Niet opgeslagen{:else}<Icon name="check" size={16} /> Opgeslagen{/if}
			</span>
			<Dropdown label="Meer acties" variant="ghost" size="sm" iconOnly align="right">
				{#snippet trigger()}<Icon name="more" size={20} />{/snippet}
				<MenuItem icon="code" onclick={() => { jsonTab = 'export'; jsonOpen = true; }}>JSON bekijken of kopiëren</MenuItem>
				<MenuItem icon="import" onclick={() => { jsonTab = 'import'; jsonOpen = true; }}>Importeren uit JSON</MenuItem>
			</Dropdown>
			<Button onclick={save} disabled={saving}><Icon name="check" size={18} /> Opslaan</Button>
		</div>

		{#if issues.length > 0}
			<div class="rounded-card border border-border bg-surface p-4" role="alert">
				<p class="mb-1 font-semibold text-rose-edge">Dit moet nog even aangepast worden:</p>
				<ul class="list-disc pl-5 text-sm">{#each issues as issue (issue)}<li>{issue}</li>{/each}</ul>
			</div>
		{/if}

		<!-- About the set: one row. -->
		<Card class="flex flex-col gap-4">
			<div class="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
				<label>
					<span class="mb-1.5 block text-sm font-semibold text-text-muted">Titel</span>
					<input class="input" bind:value={editor.set.title} placeholder="bijv. Latijn: declinaties" />
				</label>
				<label>
					<span class="mb-1.5 block text-sm font-semibold text-text-muted">Vak</span>
					<input class="input" bind:value={editor.set.subject} list="subjects" placeholder="bijv. Latijn" />
					<datalist id="subjects">{#each subjects as s (s)}<option value={s}></option>{/each}</datalist>
				</label>
				<label>
					<span class="mb-1.5 block text-sm font-semibold text-text-muted">Map (optioneel)</span>
					<input class="input" bind:value={editor.set.folder} list="folders" placeholder="bijv. Hoofdstuk 3" />
					<datalist id="folders">{#each folders as f (f)}<option value={f}></option>{/each}</datalist>
				</label>
			</div>
			<div class="max-w-md">
				<Segmented legend="Toetsenbord" options={KEYBOARDS} bind:value={editor.set.settings.keyboard} />
			</div>
			{#if auth.user}
				<div class="max-w-md">
					<Segmented legend="Zichtbaarheid" options={VISIBILITY} bind:value={visibility} onchange={onVisibility} />
				</div>
			{/if}
			<details class="rounded-tile bg-surface-2 px-3 py-2">
				<summary class="cursor-pointer text-sm font-semibold text-text-muted">Nakijken: accenten, lange klinkers en hoofdletters</summary>
				<div class="mt-3 flex flex-col gap-3 pb-1 md:flex-row md:gap-8">
					<label class="flex items-center gap-2"><input type="checkbox" class="size-5 accent-primary" bind:checked={editor.set.settings.strictAccents} /> Accenten moeten goed</label>
					<label class="flex items-center gap-2"><input type="checkbox" class="size-5 accent-primary" bind:checked={editor.set.settings.strictMacrons} /> Lange klinkers (ā, ē) moeten goed</label>
					<label class="flex items-center gap-2"><input type="checkbox" class="size-5 accent-primary" bind:checked={editor.set.settings.caseSensitive} /> Hoofdletters moeten goed</label>
				</div>
			</details>
		</Card>

		<!-- The lists: pick one on the left, edit it on the right. -->
		{#if editor.set.lists.length === 0}
			<Card class="flex flex-col gap-4">
				<div class="flex items-center gap-3">
					<Owl pose="thinking" size={64} />
					<div>
						<p class="font-heading text-lg font-semibold">Waar begin je mee?</p>
						<p class="text-text-muted">Kies wat je wilt maken.</p>
					</div>
				</div>
				{@render picker()}
				<div class="flex flex-wrap gap-2">
					<Button variant="ghost" size="sm" href="/sets/ai"><Icon name="sparkles" size={16} /> Of laat AI een set maken uit een foto of tekst</Button>
					<Button variant="ghost" size="sm" onclick={() => { jsonTab = 'import'; jsonOpen = true; }}><Icon name="import" size={16} /> Of importeer JSON</Button>
				</div>
			</Card>
		{:else}
			<div class="grid items-start gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
				<nav aria-label="Lijsten in deze set" class="flex flex-col gap-2 lg:sticky lg:top-20">
					<p class="px-1 text-sm font-semibold text-text-muted">Lijsten ({editor.set.lists.length})</p>
					<ul class="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
						{#each editor.set.lists as list (list.id)}
							<li class="shrink-0 lg:shrink">
								<button
									type="button"
									aria-current={active?.id === list.id ? 'true' : undefined}
									class={[
										'flex w-full items-center justify-between gap-3 rounded-tile border-2 px-3 py-2.5 text-left',
										active?.id === list.id ? 'border-primary bg-primary-soft' : 'border-border bg-surface hover:bg-surface-2'
									]}
									onclick={() => (activeId = list.id)}
								>
									<span class="min-w-0 truncate font-heading font-semibold">{list.title.trim() || 'Naamloze lijst'}</span>
									<span class="shrink-0 text-sm text-text-muted">{list.rows.length}</span>
								</button>
							</li>
						{/each}
					</ul>
					<div><Button variant="secondary" size="sm" onclick={() => (pickerOpen = true)}><Icon name="plus" size={16} /> Lijst toevoegen</Button></div>
				</nav>

				{#each editor.set.lists as list, i (list.id)}
					{#if list.id === active?.id}
						<ListEditor {editor} keyboard={editor.set.settings.keyboard} bind:list={editor.set.lists[i]} onpaste={() => openPaste(list.id)} />
					{/if}
				{/each}
			</div>
		{/if}
	</div>

	<Modal bind:open={pickerOpen} title="Lijst toevoegen">{@render picker()}</Modal>
	<PasteModal bind:open={pasteOpen} onadd={(rows) => editor?.addPasted(pasteListId, rows)} />
	<JsonModal bind:open={jsonOpen} {current} startTab={jsonTab} onimport={onImport} />
{/if}
