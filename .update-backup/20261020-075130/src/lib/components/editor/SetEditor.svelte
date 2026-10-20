<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { clearDraft, loadDraft, saveDraft } from '../../editor/draft';
	import { toDraft } from '../../editor/json';
	import { EditorState, emptyDraft } from '../../editor/state.svelte';
	import { TEMPLATE_CATEGORIES, type TemplateId } from '../../editor/templates';
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
	let tab = $state<'info' | 'rijtjes'>('rijtjes');
	let issues = $state<string[]>([]);
	let saving = $state(false);
	let subjects = $state<string[]>(DEFAULT_SUBJECTS);
	let folders = $state<string[]>([]);
	// svelte-ignore state_referenced_locally
	let persisted = $state(setId !== null); // exists in storage (so the URL is already /sets/<id>/edit)

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

	// Autosave: 2 seconds after the last change. A complete set is saved; an incomplete one is kept as concept.
	let timer: ReturnType<typeof setTimeout>;
	$effect(() => {
		if (!editor || !editor.dirty) return;
		JSON.stringify(editor.set); // track every edit
		clearTimeout(timer);
		timer = setTimeout(() => void persist(true), AUTOSAVE_MS);
	});

	async function persist(auto: boolean): Promise<void> {
		if (!editor || saving) return;
		const result = editor.toStudySet();
		if (!result.ok) {
			saveDraft(draftKey, editor.set);
			if (!auto) {
				issues = result.issues;
				toasts.show('Nog niet alles is ingevuld');
			}
			return;
		}
		saving = true;
		try {
			await storage.saveSet(result.set);
			clearDraft(draftKey);
			editor.markSaved();
			issues = [];
			toasts.show('Opgeslagen');
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
		} finally {
			saving = false;
		}
	}

	const current = $derived.by(() => {
		if (!editor) return null;
		const result = editor.toStudySet();
		return result.ok ? result.set : null;
	});

	function addList(template: TemplateId) {
		editor?.addList(template);
		pickerOpen = false;
		tab = 'rijtjes';
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
	<p class="py-16 text-center text-text-muted" role="status">Set laden…</p>
{:else if status === 'missing' || !editor}
	<div class="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
		<Owl pose="sleepy" size={96} />
		<h1 class="font-heading text-2xl font-semibold">Deze set bestaat niet (meer)</h1>
		<p class="text-text-muted">Misschien is hij verwijderd, of staat hij op een ander apparaat.</p>
		<Button href="/sets">Naar mijn sets</Button>
	</div>
{:else}
	<div class="mb-5 flex flex-wrap items-center gap-3">
		<Button href="/sets" variant="ghost" size="sm" iconOnly aria-label="Terug naar mijn sets"><Icon name="arrow-left" size={20} /></Button>
		<h1 class="min-w-0 flex-1 truncate font-heading text-2xl font-semibold">{editor.set.title.trim() || (setId ? 'Set bewerken' : 'Nieuwe set')}</h1>
		<Dropdown label="Meer acties" variant="ghost" size="sm" iconOnly align="right">
			{#snippet trigger()}<Icon name="more" size={20} />{/snippet}
			<MenuItem icon="code" onclick={() => { jsonTab = 'export'; jsonOpen = true; }}>JSON bekijken of kopiëren</MenuItem>
			<MenuItem icon="import" onclick={() => { jsonTab = 'import'; jsonOpen = true; }}>Importeren uit JSON</MenuItem>
		</Dropdown>
		<Button onclick={() => persist(false)} disabled={saving}>
			Opslaan
			{#if editor.dirty}<span class="ml-1 size-2.5 rounded-full bg-on-primary" role="img" aria-label="Niet-opgeslagen wijzigingen"></span>{/if}
		</Button>
	</div>

	<div class="mb-4 flex gap-2 rounded-full bg-surface-2 p-1 lg:hidden" role="tablist" aria-label="Onderdeel">
		{#each [['info', 'Info'], ['rijtjes', 'Inhoud']] as const as [id, label] (id)}
			<button type="button" role="tab" aria-selected={tab === id} class={['flex-1 rounded-full py-2 font-semibold', tab === id ? 'bg-surface shadow-card' : 'text-text-muted']} onclick={() => (tab = id)}>{label}</button>
		{/each}
	</div>

	{#if issues.length > 0}
		<div class="mb-4 rounded-card border border-border bg-surface p-4" role="alert">
			<p class="mb-1 font-semibold text-rose-edge">Dit moet nog even aangepast worden:</p>
			<ul class="list-disc pl-5 text-sm">{#each issues as issue (issue)}<li>{issue}</li>{/each}</ul>
		</div>
	{/if}

	<div class="grid items-start gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
		<div class={[tab !== 'info' && 'max-lg:hidden']}>
			<Card class="flex flex-col gap-4 lg:sticky lg:top-6">
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
				<details class="rounded-tile bg-surface-2 px-3 py-2">
					<summary class="cursor-pointer text-sm font-semibold text-text-muted">Nakijken (accenten, hoofdletters)</summary>
					<div class="mt-3 flex flex-col gap-2 pb-1">
					<label class="flex items-start gap-2"><input type="checkbox" class="mt-1 size-5 accent-primary" bind:checked={editor.set.settings.strictAccents} /><span>Accenten moeten goed<br /><span class="text-sm text-text-muted">é en e zijn verschillend</span></span></label>
					<label class="flex items-start gap-2"><input type="checkbox" class="mt-1 size-5 accent-primary" bind:checked={editor.set.settings.strictMacrons} /><span>Lange klinkers (ā, ē) moeten goed<br /><span class="text-sm text-text-muted">anders mag a voor ā</span></span></label>
					<label class="flex items-start gap-2"><input type="checkbox" class="mt-1 size-5 accent-primary" bind:checked={editor.set.settings.caseSensitive} /><span>Hoofdletters moeten goed</span></label>
					</div>
				</details>
			</Card>
		</div>

		<div class={['flex flex-col gap-4', tab !== 'rijtjes' && 'max-lg:hidden']}>
			<div class="flex flex-wrap items-center justify-between gap-2">
				<h2 class="font-heading text-xl font-semibold">Inhoud</h2>
				<Button variant="secondary" size="sm" onclick={() => (pickerOpen = true)}><Icon name="plus" size={16} /> Lijst toevoegen</Button>
			</div>

			{#each editor.set.lists as list (list.id)}
				<ListEditor {editor} {list} onpaste={() => openPaste(list.id)} />
			{:else}
				<Card class="flex flex-col gap-4">
					<div class="flex items-center gap-3">
						<Owl pose="thinking" size={64} />
						<div>
							<p class="font-heading text-lg font-semibold">Waar begin je mee?</p>
							<p class="text-text-muted">Kies wat je wilt maken.</p>
						</div>
					</div>
					{@render picker()}
					<div><Button variant="ghost" size="sm" onclick={() => { jsonTab = 'import'; jsonOpen = true; }}><Icon name="import" size={16} /> Of importeer JSON</Button></div>
				</Card>
			{/each}
		</div>
	</div>

	<Modal bind:open={pickerOpen} title="Lijst toevoegen">{@render picker()}</Modal>
	<PasteModal bind:open={pasteOpen} onadd={(rows) => editor?.addPasted(pasteListId, rows)} />
	<JsonModal bind:open={jsonOpen} {current} startTab={jsonTab} onimport={onImport} />
{/if}