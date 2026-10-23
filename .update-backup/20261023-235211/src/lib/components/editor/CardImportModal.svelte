<script lang="ts">
	import { goto } from '$app/navigation';
	import { cardsToSet, DEFAULT_CARD_OPTIONS, parseCards, type CardOptions } from '../../editor/cards';
	import { toasts } from '../../state/toast.svelte';
	import { getStorage } from '../../storage';
	import { StorageError } from '../../storage/adapter';
	import { newId } from '../../utils/id';
	import Button from '../ui/Button.svelte';
	import Icon from '../ui/Icon.svelte';
	import Modal from '../ui/Modal.svelte';

	// Import a card export of Quizlet, StudyGo and similar apps as a new vocab set.
	type Props = { open: boolean };
	let { open = $bindable(false) }: Props = $props();

	const storage = getStorage();
	const SUBJECTS = ['Latijn', 'Grieks', 'Nederlands', 'Engels', 'Frans', 'Duits'];
	let text = $state('');
	let title = $state('');
	let subject = $state('');
	let options = $state<CardOptions>({ ...DEFAULT_CARD_OPTIONS });
	let saving = $state(false);
	let problem = $state('');

	const parsed = $derived(parseCards(text, options));
	const preview = $derived(parsed.cards.slice(0, 5));
	const TERM_NAMES = { tab: 'tab', semicolon: 'puntkomma', dash: 'streepje', equals: 'is-teken', comma: 'komma' } as const;

	async function pickFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		if (file.size > 1_000_000) {
			problem = 'Dit bestand is te groot (maximaal 1 MB).';
			return;
		}
		problem = '';
		text = await file.text();
		if (!title) title = file.name.replace(/\.[^.]+$/, '');
	}

	async function create() {
		if (saving) return;
		const set = cardsToSet(parsed.cards, { title, subject }, newId);
		if (!set) {
			problem = 'Er zijn geen kaartjes herkend. Controleer het scheidingsteken onder Meer opties.';
			return;
		}
		saving = true;
		try {
			await storage.saveSet(set);
			open = false;
			await goto(`/sets/${set.id}`);
		} catch (error) {
			toasts.show(error instanceof StorageError ? error.message : 'Opslaan is mislukt');
		} finally {
			saving = false;
		}
	}
</script>

<Modal bind:open title="Importeren uit Quizlet of StudyGo">
	<div class="flex flex-col gap-4">
		<p class="text-text-muted">
			Exporteer je set in Quizlet (Exporteren, kopieer tekst) of StudyGo, en plak het hier. Je krijgt een nieuwe woordenlijst met één rij per kaartje.
		</p>
		<label>
			<span class="mb-1.5 block text-sm font-semibold text-text-muted">Geëxporteerde tekst</span>
			<textarea class="input min-h-40 font-mono text-sm" bind:value={text} placeholder={'mensa\ttafel\nagricola\tboer'}></textarea>
		</label>
		<label class="inline-flex w-fit cursor-pointer items-center gap-2 text-sm font-semibold text-primary">
			<Icon name="import" size={16} /> Of kies een tekstbestand (.txt, .csv)
			<input type="file" accept=".txt,.csv,.tsv,text/plain,text/csv" class="sr-only" onchange={pickFile} aria-label="Tekstbestand kiezen" />
		</label>

		<div class="grid gap-4 sm:grid-cols-2">
			<label>
				<span class="mb-1.5 block text-sm font-semibold text-text-muted">Titel</span>
				<input class="input" bind:value={title} placeholder="bijv. Hoofdstuk 3 woorden" />
			</label>
			<label>
				<span class="mb-1.5 block text-sm font-semibold text-text-muted">Vak</span>
				<input class="input" bind:value={subject} list="card-import-subjects" placeholder="bijv. Latijn" />
				<datalist id="card-import-subjects">{#each SUBJECTS as s (s)}<option value={s}></option>{/each}</datalist>
			</label>
		</div>

		<details class="rounded-tile bg-surface-2 p-3">
			<summary class="cursor-pointer font-heading font-semibold">Meer opties</summary>
			<div class="mt-3 grid gap-4 sm:grid-cols-3">
				<label>
					<span class="mb-1.5 block text-sm font-semibold text-text-muted">Tussen woord en vertaling</span>
					<select class="input" bind:value={options.term}>
						<option value="auto">Automatisch</option>
						<option value="tab">Tab</option>
						<option value="semicolon">Puntkomma (;)</option>
						<option value="dash">Streepje ( - )</option>
						<option value="equals">Is-teken (=)</option>
						<option value="comma">Komma (,)</option>
					</select>
				</label>
				<label>
					<span class="mb-1.5 block text-sm font-semibold text-text-muted">Tussen kaartjes</span>
					<select class="input" bind:value={options.cards}>
						<option value="line">Nieuwe regel</option>
						<option value="blank">Lege regel</option>
					</select>
				</label>
				<label>
					<span class="mb-1.5 block text-sm font-semibold text-text-muted">Meerdere antwoorden splitsen op</span>
					<select class="input" bind:value={options.split}>
						<option value="none">Niet splitsen</option>
						<option value="slash">Schuine streep (/)</option>
						<option value="semicolon">Puntkomma (;)</option>
						<option value="comma">Komma (,)</option>
					</select>
				</label>
			</div>
		</details>

		<div class="min-h-24" aria-live="polite">
			{#if text.trim() === ''}
				<p class="text-sm text-text-muted">Hier zie je een voorbeeld zodra je tekst hebt geplakt.</p>
			{:else}
				<p class="text-sm font-semibold text-text-muted">
					{parsed.cards.length} {parsed.cards.length === 1 ? 'kaartje' : 'kaartjes'} herkend{parsed.term ? ` (scheiding: ${TERM_NAMES[parsed.term]})` : ''}{parsed.skipped > 0 ? `, ${parsed.skipped} ${parsed.skipped === 1 ? 'regel' : 'regels'} overgeslagen` : ''}
				</p>
				<ul class="mt-2 flex flex-col gap-1 text-sm">
					{#each preview as card, i (i)}
						<li class="flex gap-2"><span class="min-w-0 flex-1 truncate font-semibold">{card.prompt}</span><span aria-hidden="true">→</span><span class="min-w-0 flex-1 truncate">{card.answers.join(' / ')}</span></li>
					{/each}
				</ul>
			{/if}
		</div>
		<p class="min-h-6 text-sm font-semibold text-rose-edge" role="alert">{problem}</p>
	</div>
	{#snippet actions()}
		<Button variant="ghost" onclick={() => (open = false)}>Annuleren</Button>
		<Button disabled={parsed.cards.length === 0 || saving} onclick={create} class="min-w-36">{saving ? 'Bezig…' : 'Set maken'}</Button>
	{/snippet}
</Modal>
