<script lang="ts">
	import { onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { requestAiImport } from '../../ai/client';
	import { prepareDocument, MAX_PDF_BYTES, type PreparedDocument } from '../../ai/documents';
	import { MAX_IMAGES, prepareImage, type PreparedImage } from '../../ai/images';
	import { saveDraft } from '../../editor/draft';
	import { toDraft } from '../../editor/json';
	import { EditorState } from '../../editor/state.svelte';
	import { auth } from '../../state/auth.svelte';
	import { toasts } from '../../state/toast.svelte';
	import { getStorage } from '../../storage';
	import { StorageError } from '../../storage/adapter';
	import AiImportSkeleton from '../skeleton/AiImportSkeleton.svelte';
	import ListEditor from '../editor/ListEditor.svelte';
	import PasteModal from '../editor/PasteModal.svelte';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Dropdown from '../ui/Dropdown.svelte';
	import Icon from '../ui/Icon.svelte';
	import MenuItem from '../ui/MenuItem.svelte';
	import Owl from '../ui/Owl.svelte';
	import Segmented from '../ui/Segmented.svelte';

	const storage = getStorage();
	const SUBJECTS = ['Latijn', 'Grieks', 'Nederlands', 'Engels', 'Frans', 'Duits'];
	const SOURCES = [
		{ id: 'document', name: 'Document', text: 'Kies een PDF of Word-bestand (.docx) met je rijtjes of woordenlijst.' },
		{ id: 'photos', name: 'Foto\'s', text: 'Maak een foto van je boek of schrift, of kies foto\'s uit je galerij.' },
		{ id: 'text', name: 'Tekst', text: 'Plak tekst die je ergens vandaan hebt gekopieerd.' }
	] as const;

	type Step = 'input' | 'working' | 'review';
	let step = $state<Step>('input');
	let source = $state<'document' | 'photos' | 'text'>('photos');
	let doc = $state<PreparedDocument | null>(null);
	let images = $state<PreparedImage[]>([]);
	let text = $state('');
	let subject = $state('');
	let note = $state('');
	let preparing = $state(false);
	let problem = $state('');
	let dragging = $state(false);

	let editor = $state<EditorState | null>(null);
	let notes = $state<string[]>([]);
	let activeId = $state<string | null>(null);
	let saving = $state(false);
	let issues = $state<string[]>([]);
	let pasteOpen = $state(false);
	let abort: AbortController | null = null;

	const hasInput = $derived(source === 'photos' ? images.length > 0 : source === 'document' ? doc !== null : text.trim() !== '');
	const sourceLabel = $derived(source === 'photos' ? (images.length === 1 ? 'foto' : 'foto\'s') : source === 'document' ? 'document' : 'tekst');
	const active = $derived(editor?.set.lists.find((l) => l.id === activeId) ?? editor?.set.lists[0] ?? null);
	const rowTotal = $derived(editor?.set.lists.reduce((sum, l) => sum + l.rows.length, 0) ?? 0);

	onDestroy(() => {
		abort?.abort();
		for (const image of images) URL.revokeObjectURL(image.previewUrl);
	});

	async function addFiles(files: FileList | File[]) {
		problem = '';
		const list = [...files];
		const room = MAX_IMAGES - images.length;
		if (list.length > room) problem = `Je kunt maximaal ${MAX_IMAGES} foto's tegelijk gebruiken.`;
		preparing = true;
		for (const file of list.slice(0, Math.max(0, room))) {
			try {
				images.push(await prepareImage(file));
			} catch (error) {
				problem = error instanceof Error ? error.message : 'Deze foto kan niet gebruikt worden.';
			}
		}
		preparing = false;
	}

	function removeImage(id: string) {
		const image = images.find((i) => i.id === id);
		if (image) URL.revokeObjectURL(image.previewUrl);
		images = images.filter((i) => i.id !== id);
	}

	async function addDocument(file: File) {
		problem = '';
		preparing = true;
		try {
			doc = await prepareDocument(file);
		} catch (error) {
			problem = error instanceof Error ? error.message : 'Dit bestand kan niet gebruikt worden.';
		}
		preparing = false;
	}

	function onPick(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (source === 'document') {
			if (file) void addDocument(file);
		} else if (input.files) void addFiles(input.files);
		input.value = '';
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		const files = event.dataTransfer?.files;
		if (!files?.length) return;
		if (source === 'document') void addDocument(files[0]);
		else void addFiles(files);
	}

	async function start() {
		if (!hasInput || step === 'working') return;
		problem = '';
		step = 'working';
		abort = new AbortController();
		const outcome = await requestAiImport({ text: source === 'text' ? text : source === 'document' && doc?.kind === 'docx' ? doc.text : '', images: source === 'photos' ? images : [], pdfs: source === 'document' && doc?.kind === 'pdf' ? [{ data: doc.data }] : [], subject, note }, abort.signal);
		abort = null;
		if (!outcome.ok) {
			step = 'input';
			if (!outcome.aborted) problem = outcome.message;
			return;
		}
		// Preview only: nothing is stored until the user presses Opslaan.
		editor = new EditorState(toDraft(outcome.set), false);
		notes = outcome.notes;
		activeId = editor.set.lists[0]?.id ?? null;
		issues = [];
		step = 'review';
	}

	function cancel() {
		abort?.abort();
	}

	function backToInput() {
		step = 'input';
		editor = null;
	}

	async function save() {
		if (!editor || saving) return;
		const result = editor.toStudySet();
		if (!result.ok) {
			issues = result.issues;
			toasts.show('Nog niet alles is ingevuld');
			return;
		}
		saving = true;
		try {
			await storage.saveSet(result.set);
			await goto(`/sets/${result.set.id}`);
		} catch (error) {
			toasts.show(error instanceof StorageError ? error.message : 'Opslaan is mislukt');
		} finally {
			saving = false;
		}
	}

	/** Hands the preview to the full editor as an unsaved concept (the editor restores it from the draft store). */
	async function openInEditor() {
		if (!editor) return;
		saveDraft('new', editor.set);
		await goto('/sets/new');
	}
</script>

<svelte:head><title>Maken met AI · Uiltje</title></svelte:head>

{#if !auth.user}
	<div class="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
		<Owl pose="idle" size={96} bob />
		<h1 class="font-heading text-2xl font-semibold">Log in om de AI te gebruiken</h1>
		<p class="text-text-muted">De AI-import is er voor accounts, zodat de gratis limiet eerlijk verdeeld blijft. Je sets blijven gewoon van jou.</p>
		<Button href="/login?next=/sets/ai"><Icon name="log-in" size={18} /> Inloggen</Button>
	</div>
{:else if step === 'working'}
	<div class="flex flex-col gap-5">
		<div class="flex items-center gap-4">
			<Owl pose="thinking" size={64} />
			<div class="min-w-0 flex-1" role="status" aria-live="polite">
				<h1 class="font-heading text-2xl font-semibold">Uiltje leest je {sourceLabel}…</h1>
				<p class="text-text-muted">Dit duurt meestal 10 tot 30 seconden.</p>
			</div>
			<Button variant="ghost" onclick={cancel}>Annuleren</Button>
		</div>
		<AiImportSkeleton />
	</div>
{:else if step === 'review' && editor}
	<div class="flex flex-col gap-5">
		<div class="sticky top-0 z-20 -mx-4 flex items-center gap-3 bg-bg/90 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
			<Button variant="ghost" size="sm" iconOnly aria-label="Opnieuw beginnen" onclick={backToInput}><Icon name="arrow-left" size={20} /></Button>
			<h1 class="min-w-0 flex-1 truncate font-heading text-xl font-semibold sm:text-2xl">Controleer je set</h1>
			<Dropdown label="Meer acties" variant="ghost" size="sm" iconOnly align="right">
				{#snippet trigger()}<Icon name="more" size={20} />{/snippet}
				<MenuItem icon="pencil" onclick={openInEditor}>Open in de volledige editor</MenuItem>
				<MenuItem icon="repeat" onclick={backToInput}>Opnieuw proberen</MenuItem>
			</Dropdown>
			<Button onclick={save} disabled={saving} class="min-w-32"><Icon name="check" size={18} /> {saving ? 'Opslaan…' : 'Opslaan'}</Button>
		</div>

		<Card class="flex items-start gap-3">
			<Owl pose="happy" size={48} />
			<div class="min-w-0">
				<p class="font-heading text-lg font-semibold">{rowTotal} {rowTotal === 1 ? 'rij' : 'rijen'} in {editor.set.lists.length} {editor.set.lists.length === 1 ? 'lijst' : 'lijsten'} gevonden</p>
				<p class="text-text-muted">De AI maakt weleens fouten, vooral bij accenten en kleine lettertjes. Loop alles even na voordat je opslaat; er is nog niets bewaard.</p>
				{#if notes.length > 0}
					<ul class="mt-2 list-disc pl-5 text-sm">{#each notes as note (note)}<li>{note}</li>{/each}</ul>
				{/if}
			</div>
		</Card>

		{#if issues.length > 0}
			<div class="rounded-card border border-border bg-surface p-4" role="alert">
				<p class="mb-1 font-semibold text-rose-edge">Dit moet nog even aangepast worden:</p>
				<ul class="list-disc pl-5 text-sm">{#each issues as issue (issue)}<li>{issue}</li>{/each}</ul>
			</div>
		{/if}

		<Card class="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
			<label>
				<span class="mb-1.5 block text-sm font-semibold text-text-muted">Titel</span>
				<input class="input" bind:value={editor.set.title} />
			</label>
			<label>
				<span class="mb-1.5 block text-sm font-semibold text-text-muted">Vak</span>
				<input class="input" bind:value={editor.set.subject} list="ai-subjects" />
			</label>
			<label>
				<span class="mb-1.5 block text-sm font-semibold text-text-muted">Map (optioneel)</span>
				<input class="input" bind:value={editor.set.folder} placeholder="bijv. Hoofdstuk 3" />
			</label>
			<datalist id="ai-subjects">{#each SUBJECTS as s (s)}<option value={s}></option>{/each}</datalist>
		</Card>

		<div class="grid items-start gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
			<nav aria-label="Lijsten in deze set" class="flex flex-col gap-2 lg:sticky lg:top-20">
				<p class="px-1 text-sm font-semibold text-text-muted">Lijsten ({editor.set.lists.length})</p>
				<ul class="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
					{#each editor.set.lists as list (list.id)}
						<li class="shrink-0 lg:shrink">
							<button
								type="button"
								aria-current={active?.id === list.id ? 'true' : undefined}
								class={['flex w-full items-center justify-between gap-3 rounded-tile border-2 px-3 py-2.5 text-left', active?.id === list.id ? 'border-primary bg-primary-soft' : 'border-border bg-surface hover:bg-surface-2']}
								onclick={() => (activeId = list.id)}
							>
								<span class="min-w-0 truncate font-heading font-semibold">{list.title.trim() || 'Naamloze lijst'}</span>
								<span class="shrink-0 text-sm text-text-muted">{list.rows.length}</span>
							</button>
						</li>
					{/each}
				</ul>
			</nav>
			{#each editor.set.lists as list, i (list.id)}
				{#if list.id === active?.id}
					<ListEditor {editor} keyboard={editor.set.settings.keyboard} bind:list={editor.set.lists[i]} onpaste={() => (pasteOpen = true)} />
				{/if}
			{/each}
		</div>
	</div>
	<PasteModal bind:open={pasteOpen} onadd={(rows) => active && editor?.addPasted(active.id, rows)} />
{:else}
	<div class="mx-auto flex max-w-3xl flex-col gap-5">
		<div class="flex items-center gap-4">
			<Owl pose="idle" size={64} />
			<div>
				<h1 class="font-heading text-3xl font-semibold">Maken met AI</h1>
				<p class="text-text-muted">Document, foto of tekst erin, een set eruit. Je controleert alles voordat het wordt opgeslagen.</p>
			</div>
		</div>

		<Card class="flex flex-col gap-5">
			<Segmented legend="Waaruit wil je een set maken?" options={SOURCES} bind:value={source} />

			{#if source === 'document'}
				<div>
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<label
						class={['flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed p-6 text-center', dragging ? 'border-primary bg-primary-soft' : 'border-border bg-surface-2 hover:border-primary']}
						ondragover={(e) => { e.preventDefault(); dragging = true; }}
						ondragleave={() => (dragging = false)}
						ondrop={onDrop}
					>
						<Icon name="import" size={28} />
						<span class="font-heading text-lg font-semibold">{preparing ? 'Document lezen…' : 'Kies of sleep een document hierheen'}</span>
						<span class="text-sm text-text-muted">PDF (tot {(MAX_PDF_BYTES / 1_000_000).toFixed(1).replace('.', ',')} MB) of Word (.docx). Eén bestand tegelijk.</span>
						<input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" class="sr-only" onchange={onPick} aria-label="Document kiezen" />
					</label>
					{#if doc}
						<div class="mt-3 flex items-center gap-3 rounded-tile border border-border bg-surface px-3 py-2.5">
							<Icon name="import" size={20} />
							<span class="min-w-0 flex-1 truncate font-semibold">{doc.name}</span>
							<span class="shrink-0 text-sm text-text-muted">{doc.kind === 'pdf' ? 'PDF' : `Word · ${doc.text.length.toLocaleString('nl-NL')} tekens`}</span>
							<Button variant="secondary" size="sm" iconOnly aria-label="Document {doc.name} weghalen" onclick={() => (doc = null)}><Icon name="x" size={16} /></Button>
						</div>
					{/if}
				</div>
			{:else if source === 'photos'}
				<div>
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<label
						class={['flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed p-6 text-center', dragging ? 'border-primary bg-primary-soft' : 'border-border bg-surface-2 hover:border-primary']}
						ondragover={(e) => { e.preventDefault(); dragging = true; }}
						ondragleave={() => (dragging = false)}
						ondrop={onDrop}
					>
						<Icon name="import" size={28} />
						<span class="font-heading text-lg font-semibold">{preparing ? 'Foto verkleinen…' : 'Kies of sleep foto\'s hierheen'}</span>
						<span class="text-sm text-text-muted">Tot {MAX_IMAGES} foto's (JPEG, PNG of WebP). Op je telefoon kun je meteen een foto maken.</span>
						<input type="file" accept="image/*" multiple class="sr-only" onchange={onPick} aria-label="Foto's kiezen" />
					</label>
					{#if images.length > 0}
						<ul class="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
							{#each images as image (image.id)}
								<li class="relative">
									<img src={image.previewUrl} alt={image.name} class="aspect-square w-full rounded-tile border border-border object-cover" />
									<Button variant="secondary" size="sm" iconOnly class="absolute -top-2 -right-2" aria-label="Foto {image.name} weghalen" onclick={() => removeImage(image.id)}><Icon name="x" size={16} /></Button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{:else}
				<label>
					<span class="mb-1.5 block text-sm font-semibold text-text-muted">Tekst</span>
					<textarea class="input min-h-56" bind:value={text} maxlength="20000" placeholder={'Plak hier je woordenlijst, rijtje of aantekeningen…'}></textarea>
				</label>
			{/if}

			<div class="grid gap-4 sm:grid-cols-2">
				<label>
					<span class="mb-1.5 block text-sm font-semibold text-text-muted">Vak (optioneel)</span>
					<input class="input" bind:value={subject} list="ai-subjects-input" placeholder="De AI raadt het anders zelf" />
					<datalist id="ai-subjects-input">{#each SUBJECTS as s (s)}<option value={s}></option>{/each}</datalist>
				</label>
				<label>
					<span class="mb-1.5 block text-sm font-semibold text-text-muted">Extra uitleg (optioneel)</span>
					<input class="input" bind:value={note} maxlength="500" placeholder="bijv. alleen de rijtjes op bladzijde 12" />
				</label>
			</div>

			<div class="flex flex-wrap items-center gap-3">
				<Button onclick={start} disabled={!hasInput || preparing} class="min-w-40"><Icon name="sparkles" size={18} /> Maak set</Button>
				<p class="min-h-6 min-w-0 flex-1 text-sm font-semibold text-rose-edge" role="alert">{problem}</p>
			</div>
			<p class="text-sm text-text-muted">Je foto's, documenten en tekst worden naar Google Gemini gestuurd om te lezen en niet door Uiltje bewaard. Gebruik dus niets met persoonlijke gegevens.</p>
		</Card>
	</div>
{/if}
