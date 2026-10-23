<script lang="ts">
	import { untrack } from 'svelte';
	import { CATALOGUES } from '../../grammar/catalogues';
	import { buildRows, catalogueForSubject, DEFAULT_CATALOGUE, matchesQuery, PICKER_GROUPS, refOf, sectionsFor, type PickerGroupId } from '../../grammar/picker';
	import { describe, type ConceptRow, type CustomItem } from '../../grammar/rows';
	import { createQuestionsApi } from '../../grammar/questions';
	import type { ApprovedQuestion } from '../../grammar/questions-core';
	import { createSuggestionsApi } from '../../grammar/suggestions';
	import type { CommunityItem } from '../../grammar/suggestions-core';
	import type { GrammarCatalogue } from '../../grammar/types';
	import { auth } from '../../state/auth.svelte';
	import Button from '../ui/Button.svelte';
	import Icon from '../ui/Icon.svelte';
	import Modal from '../ui/Modal.svelte';
	import Segmented from '../ui/Segmented.svelte';
	import Skeleton from '../ui/Skeleton.svelte';

	// "Kies onderdelen": tick the stijlfiguren or grammar items you need from the examenprogramma (CvTE syllabus),
	// and/or type your own (term + explanation). The rows are built from the syllabus text, not by an AI.
	type Props = {
		open?: boolean;
		/** Subject of the set: picks the Latin or the Greek catalogue. */
		subject: string;
		initialGroup: PickerGroupId;
		/** Refs that are already in the list you are adding to: shown as "al in je lijst". */
		existingRefs?: readonly string[];
		/** True when adding to an existing list (the button says so). */
		appending?: boolean;
		onadd: (rows: ConceptRow[], title: string) => void;
		onsuggest: () => void;
	};
	let { open = $bindable(false), subject, initialGroup, existingRefs = [], appending = false, onadd, onsuggest }: Props = $props();

	let catalogueId = $state<GrammarCatalogue['id']>(DEFAULT_CATALOGUE.id);
	let group = $state<PickerGroupId>('stijl');
	let query = $state('');
	let refs = $state<string[]>([]);
	let communityIds = $state<string[]>([]);
	let customs = $state<CustomItem[]>([]);
	let withExamples = $state(true);
	let withBank = $state(true);
	let bank = $state<ApprovedQuestion[]>([]);
	let community = $state<CommunityItem[]>([]);
	let communityStatus = $state<'idle' | 'loading' | 'done' | 'failed'>('idle');
	let customForm = $state({ term: '', definition: '', example: '', exampleTranslation: '' });
	let customError = $state('');

	const catalogue = $derived(CATALOGUES.find((c) => c.id === catalogueId) ?? DEFAULT_CATALOGUE);
	const subjectFixed = $derived(catalogueForSubject(subject) !== undefined);
	const existing = $derived(new Set(existingRefs));
	const sections = $derived(
		sectionsFor(catalogue, group)
			.map((section) => ({ ...section, items: section.items.filter((item) => matchesQuery(item, query)) }))
			.filter((section) => section.items.length > 0)
	);
	const communityVisible = $derived(community.filter((item) => matchesQuery({ term: item.term, summary: item.definition }, query)));
	const rows = $derived(buildRows({ catalogue, refs, community, communityIds, custom: customs, withExamples, bank: withBank ? bank : [] }));
	const bankAvailable = $derived(bank.filter((q) => refs.includes(q.ref)).length);
	const itemCount = $derived(refs.length + communityIds.length + customs.length);
	const groupTitle = $derived(PICKER_GROUPS.find((g) => g.id === group)?.name ?? 'Grammatica');

	// Each time the dialog opens, everything starts fresh.
	$effect(() => {
		if (!open) return;
		untrack(() => {
			catalogueId = (catalogueForSubject(subject) ?? DEFAULT_CATALOGUE).id;
			group = initialGroup;
			query = '';
			refs = [];
			communityIds = [];
			customs = [];
			customForm = { term: '', definition: '', example: '', exampleTranslation: '' };
			customError = '';
		});
	});

	// Accepted rules of other users for this subject (only for signed-in users; not an error when there are none).
	$effect(() => {
		if (!open) return;
		const client = auth.client;
		const user = auth.user;
		const wanted = catalogue.subject;
		untrack(() => {
			community = [];
			communityIds = [];
			bank = [];
			if (!client || !user) {
				communityStatus = 'idle';
				return;
			}
			// Approved AI questions (not an error when there are none or the SQL is not run yet).
			const catalogueNow = catalogue.id;
			createQuestionsApi(client)
				.approved(catalogueNow)
				.then((items) => {
					if (catalogue.id === catalogueNow) bank = items;
				})
				.catch(() => {});
			communityStatus = 'loading';
			createSuggestionsApi(client)
				.communityItems(wanted)
				.then((items) => {
					if (catalogue.subject !== wanted) return;
					community = items;
					communityStatus = 'done';
				})
				.catch(() => {
					communityStatus = 'failed';
				});
		});
	});

	function toggle(ref: string) {
		refs = refs.includes(ref) ? refs.filter((r) => r !== ref) : [...refs, ref];
	}

	function toggleCommunity(id: string) {
		communityIds = communityIds.includes(id) ? communityIds.filter((x) => x !== id) : [...communityIds, id];
	}

	function toggleSection(items: { id: string }[]) {
		const free = items.map((item) => `${catalogue.id}/${item.id}`).filter((ref) => !existing.has(ref));
		const allOn = free.length > 0 && free.every((ref) => refs.includes(ref));
		refs = allOn ? refs.filter((ref) => !free.includes(ref)) : [...new Set([...refs, ...free])];
	}

	function addCustom() {
		const term = customForm.term.trim();
		const definition = customForm.definition.trim();
		if (term === '') return void (customError = 'Vul de naam in.');
		if (definition === '') return void (customError = 'Vul de uitleg in. Zonder uitleg kan er geen vraag van gemaakt worden.');
		customs = [...customs, { term, definition, example: customForm.example.trim(), exampleTranslation: customForm.exampleTranslation.trim() }];
		customForm = { term: '', definition: '', example: '', exampleTranslation: '' };
		customError = '';
	}

	function add() {
		if (rows.length === 0) return;
		onadd(rows, groupTitle === 'Grammatica' ? 'Grammatica' : 'Stijlfiguren');
		open = false;
	}

	const CATALOGUE_CHOICES = CATALOGUES.map((c) => ({ id: c.id, name: c.subject }));
	const GROUP_CHOICES = PICKER_GROUPS.map((g) => ({ id: g.id, name: g.name }));
</script>

{#snippet actions()}
	<p class="mr-auto text-sm text-text-muted" aria-live="polite">{itemCount} {itemCount === 1 ? 'onderdeel' : 'onderdelen'} · {rows.length} {rows.length === 1 ? 'vraag' : 'vragen'}</p>
	<Button variant="ghost" onclick={() => (open = false)}>Annuleren</Button>
	<Button onclick={add} disabled={rows.length === 0} class="min-w-40"><Icon name="plus" size={18} /> {appending ? 'Toevoegen aan lijst' : 'Lijst maken'}</Button>
{/snippet}

<Modal bind:open title="Kies onderdelen" {actions}>
	<div class="flex flex-col gap-4">
		<p class="text-sm text-text-muted">
			Zet een vinkje bij wat je nodig hebt. Bron: {catalogue.source.publisher}, {catalogue.source.title}. Mis je iets, voeg het hieronder zelf toe.
		</p>

		{#if !subjectFixed}
			<Segmented legend="Welk vak?" options={CATALOGUE_CHOICES} bind:value={catalogueId} />
		{/if}
		<Segmented legend="Wat?" options={GROUP_CHOICES} bind:value={group} />

		<label>
			<span class="sr-only">Zoeken</span>
			<input class="input" type="search" bind:value={query} placeholder="Zoek een term, bijv. litotes of genitivus" autocomplete="off" />
		</label>

		<label class="flex cursor-pointer items-start gap-3 rounded-tile bg-surface-2 p-3">
			<input type="checkbox" class="mt-0.5 size-5 shrink-0 accent-primary" bind:checked={withExamples} />
			<span class="min-w-0">
				<span class="block font-semibold">Ook voorbeelden uit het examenprogramma als vraag</span>
				<span class="block text-sm text-text-muted">Je krijgt dan ook een Latijnse of Griekse zin, waarbij je de term moet noemen.</span>
			</span>
		</label>

		{#if bank.length > 0}
			<label class="flex cursor-pointer items-start gap-3 rounded-tile bg-surface-2 p-3">
				<input type="checkbox" class="mt-0.5 size-5 shrink-0 accent-primary" bind:checked={withBank} />
				<span class="min-w-0">
					<span class="block font-semibold">Ook extra vragen van de AI</span>
					<span class="block text-sm text-text-muted">Zinnen en beschrijvingen die door de beheerder zijn goedgekeurd{refs.length > 0 ? ` (${bankAvailable} voor je keuze)` : ''}. Het antwoord komt altijd uit de syllabus.</span>
				</span>
			</label>
		{/if}

		<div class="flex max-h-[42vh] flex-col gap-3 overflow-y-auto pr-1">
			{#each sections as section, sectionIndex (section.id)}
				{@const free = section.items.filter((item) => !existing.has(refOf(catalogue, item)))}
				<details open={sectionIndex === 0 || query !== ''} class="rounded-card border border-border">
					<summary class="flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5">
						<span class="min-w-0 font-heading font-semibold">{section.title} <span class="font-body text-sm font-normal text-text-muted">({section.items.length})</span></span>
					</summary>
					<div class="flex flex-col gap-2 border-t border-border p-3">
						<button
							type="button"
							class="self-start rounded-full px-3 py-1 text-sm font-semibold text-primary-text hover:bg-primary-soft disabled:opacity-40"
							disabled={free.length === 0}
							onclick={() => toggleSection(section.items)}
						>
							{free.length > 0 && free.every((item) => refs.includes(refOf(catalogue, item))) ? 'Niets in deze groep' : 'Alles in deze groep'}
						</button>
						{#each section.items as item (item.id)}
							{@const ref = refOf(catalogue, item)}
							{@const taken = existing.has(ref)}
							<label class={['flex gap-3 rounded-tile border-2 border-border p-3 has-checked:border-primary has-checked:bg-primary-soft', taken ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-surface-2']}>
								<input type="checkbox" class="mt-0.5 size-5 shrink-0 accent-primary" checked={taken || refs.includes(ref)} disabled={taken} onchange={() => toggle(ref)} />
								<span class="min-w-0 flex-1">
									<span class="block font-semibold">{item.term}{taken ? ' · al in je lijst' : ''}</span>
									<span class="line-clamp-2 block text-sm text-text-muted">{describe(item)}</span>
									{#if item.examples?.length}<span class="mt-1 block text-xs font-semibold text-text-muted">{item.examples.length} {item.examples.length === 1 ? 'voorbeeld' : 'voorbeelden'}</span>{/if}
								</span>
							</label>
						{/each}
					</div>
				</details>
			{/each}

			{#if communityStatus === 'loading'}
				<div class="flex flex-col gap-2 rounded-card border border-border p-3" role="status" aria-busy="true">
					<span class="sr-only">Voorstellen van anderen laden…</span>
					<Skeleton class="h-5 w-1/2" />
					<Skeleton class="h-12 w-full" />
				</div>
			{:else if communityVisible.length > 0}
				<details class="rounded-card border border-border" open={query !== ''}>
					<summary class="cursor-pointer px-3 py-2.5 font-heading font-semibold">Aanvullingen van gebruikers <span class="font-body text-sm font-normal text-text-muted">({communityVisible.length}, goedgekeurd door de beheerder)</span></summary>
					<div class="flex flex-col gap-2 border-t border-border p-3">
						{#each communityVisible as item (item.id)}
							<label class="flex cursor-pointer gap-3 rounded-tile border-2 border-border p-3 hover:bg-surface-2 has-checked:border-primary has-checked:bg-primary-soft">
								<input type="checkbox" class="mt-0.5 size-5 shrink-0 accent-primary" checked={communityIds.includes(item.id)} onchange={() => toggleCommunity(item.id)} />
								<span class="min-w-0 flex-1">
									<span class="block font-semibold">{item.term}</span>
									<span class="line-clamp-2 block text-sm text-text-muted">{item.definition}</span>
								</span>
							</label>
						{/each}
					</div>
				</details>
			{:else if communityStatus === 'failed'}
				<p class="text-sm text-text-muted">De aanvullingen van gebruikers konden niet geladen worden. De lijst hierboven werkt gewoon.</p>
			{/if}

			{#if sections.length === 0 && communityVisible.length === 0}
				<p class="py-4 text-center text-text-muted">Niets gevonden voor "{query}". Voeg het hieronder zelf toe of stel het voor.</p>
			{/if}
		</div>

		<details class="rounded-card border border-border" open={customs.length > 0}>
			<summary class="cursor-pointer px-3 py-2.5 font-heading font-semibold">Zelf een onderdeel toevoegen{customs.length > 0 ? ` (${customs.length})` : ''}</summary>
			<div class="flex flex-col gap-3 border-t border-border p-3">
				{#each customs as custom, index (index)}
					<div class="flex items-start gap-3 rounded-tile bg-surface-2 p-3">
						<span class="min-w-0 flex-1">
							<span class="block font-semibold">{custom.term}</span>
							<span class="line-clamp-2 block text-sm text-text-muted">{custom.definition}</span>
						</span>
						<Button variant="ghost" size="sm" iconOnly aria-label="{custom.term} weghalen" onclick={() => (customs = customs.filter((_, i) => i !== index))}><Icon name="x" size={16} /></Button>
					</div>
				{/each}
				<form class="flex flex-col gap-3" onsubmit={(e) => { e.preventDefault(); addCustom(); }}>
					<label>
						<span class="mb-1.5 block text-sm font-semibold text-text-muted">Naam (het antwoord dat je moet geven)</span>
						<input class="input" bind:value={customForm.term} autocapitalize="none" placeholder="bijv. kop-staartconstructie" />
					</label>
					<label>
						<span class="mb-1.5 block text-sm font-semibold text-text-muted">Uitleg (dit is de vraag)</span>
						<textarea class="input min-h-20" bind:value={customForm.definition} placeholder="bijv. Een werkwoord aan het einde van een zin wordt aan het begin van de volgende herhaald."></textarea>
					</label>
					<div class="grid gap-3 sm:grid-cols-2">
						<label>
							<span class="mb-1.5 block text-sm font-semibold text-text-muted">Voorbeeld (optioneel)</span>
							<input class="input" bind:value={customForm.example} autocapitalize="none" spellcheck="false" />
						</label>
						<label>
							<span class="mb-1.5 block text-sm font-semibold text-text-muted">Vertaling (optioneel)</span>
							<input class="input" bind:value={customForm.exampleTranslation} />
						</label>
					</div>
					<div class="flex flex-wrap items-center gap-3">
						<Button type="submit" variant="secondary" size="sm"><Icon name="plus" size={16} /> Aan de selectie toevoegen</Button>
						<p class="min-h-5 min-w-0 flex-1 text-sm font-semibold text-rose-edge" role="alert">{customError}</p>
					</div>
				</form>
			</div>
		</details>

		<div class="flex flex-wrap items-center justify-between gap-2 rounded-tile bg-surface-2 p-3">
			<p class="min-w-0 flex-1 text-sm text-text-muted">Vind je iets niet dat standaard in de app hoort te staan?</p>
			<Button variant="secondary" size="sm" onclick={onsuggest}><Icon name="sparkles" size={16} /> Stel een regel voor</Button>
		</div>
	</div>
</Modal>
