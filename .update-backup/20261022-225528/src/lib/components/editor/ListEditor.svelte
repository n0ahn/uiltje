<script lang="ts">
	import { tick } from 'svelte';
	import { KIND_LABELS } from '../../editor/templates';
	import type { EditorState } from '../../editor/state.svelte';
	import type { DraftList } from '../../editor/types';
	import { isWordKind, LIST_KINDS, type Keyboard } from '../../schema/types';
	import { greekKeyboard } from '../../utils/keyboard';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Dropdown from '../ui/Dropdown.svelte';
	import Icon from '../ui/Icon.svelte';
	import MenuItem from '../ui/MenuItem.svelte';

	type Props = {
		editor: EditorState;
		list: DraftList;
		keyboard: Keyboard;
		onpaste: () => void;
		/** Only for lists of begrippen: opens the "kies onderdelen" screen to add more items. */
		onconcepts?: () => void;
	};
	let { editor, list = $bindable(), keyboard, onpaste, onconcepts }: Props = $props();

	// Tags and dimensions are for rijtjes only and stay hidden until asked for.
	let advanced = $state(false);
	// Words and begrippen are asked one at a time (no tags or stages), so they share the same editor.
	const isVocab = $derived(isWordKind(list.kind));
	const isConcept = $derived(list.kind === 'concept');
	const showTags = $derived(advanced && !isVocab);

	let dimensionName = $state('');
	let dimensionError = $state('');
	let dragId: string | null = $state(null);
	let table: HTMLElement | undefined = $state();
	let dimensionPanel: HTMLElement | undefined = $state();

	async function addRowAfter(rowId?: string) {
		const id = editor.addRow(list.id, rowId);
		if (!id) return;
		await tick();
		table?.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-row="${id}"] [data-field="prompt"]`)?.focus();
	}

	function onCellKeydown(event: KeyboardEvent, rowId: string) {
		if (event.isComposing) return;
		if (event.key === 'Enter') {
			event.preventDefault();
			void addRowAfter(rowId);
		} else if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
			event.preventDefault();
			const index = list.rows.findIndex((r) => r.id === rowId);
			editor.moveRow(list.id, rowId, index + (event.key === 'ArrowUp' ? -1 : 1));
		}
	}

	function addDimension() {
		dimensionError = editor.addDimension(list.id, dimensionName) ?? '';
		if (!dimensionError) dimensionName = '';
	}

	function renameDimension(event: Event, name: string) {
		const input = event.currentTarget as HTMLInputElement;
		const error = editor.renameDimension(list.id, name, input.value);
		dimensionError = error ?? '';
		if (error) input.value = name;
	}

	async function moveDimension(name: string, offset: -1 | 1, side: 'left' | 'right') {
		const index = list.dimensions.indexOf(name);
		if (index === -1) return;
		editor.moveDimension(list.id, name, index + offset);
		// The chip is re-ordered in the DOM: put the focus back on the button that was used.
		await tick();
		dimensionPanel?.querySelector<HTMLElement>(`[data-dim="${CSS.escape(name)}"] [data-move="${side}"]`)?.focus();
	}

	function onDimensionKeydown(event: KeyboardEvent, name: string) {
		if (!event.altKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
		event.preventDefault();
		void moveDimension(name, event.key === 'ArrowLeft' ? -1 : 1, event.key === 'ArrowLeft' ? 'left' : 'right');
	}

	function onDrop(targetId: string) {
		if (!dragId || dragId === targetId) return;
		const to = list.rows.findIndex((r) => r.id === targetId);
		editor.moveRow(list.id, dragId, to);
		dragId = null;
	}
</script>

<Card class="flex flex-col gap-4">
	<div class="flex items-end gap-3">
		<label class="min-w-0 flex-1">
			<span class="mb-1.5 block text-sm font-semibold text-text-muted">{isVocab ? 'Titel van de lijst' : 'Titel van het rijtje'}</span>
			<input class="input" bind:value={list.title} placeholder={isConcept ? 'bijv. Stijlfiguren voor het examen' : isVocab ? 'bijv. Hoofdstuk 3' : 'bijv. mensa (1e declinatie)'} />
		</label>
		<Dropdown label="Meer opties voor deze lijst" variant="ghost" size="sm" iconOnly align="right">
			{#snippet trigger()}<Icon name="more" size={20} />{/snippet}
			{#if isConcept && onconcepts}<MenuItem icon="plus" onclick={onconcepts}>Onderdelen kiezen uit de lijst</MenuItem>{/if}
			<MenuItem icon="paste" onclick={onpaste}>Plak uit tekst</MenuItem>
			{#if !isVocab}<MenuItem icon="tag" onclick={() => (advanced = !advanced)}>{advanced ? 'Tags verbergen' : 'Tags en dimensies tonen'}</MenuItem>{/if}
			<MenuItem icon="trash" danger onclick={() => editor.removeList(list.id)}>Lijst verwijderen</MenuItem>
		</Dropdown>
	</div>

	<details class="rounded-tile bg-surface-2 px-3 py-2">
		<summary class="cursor-pointer text-sm font-semibold text-text-muted">Meer instellingen</summary>
		<div class="mt-3 flex flex-wrap gap-3 pb-1">
			<label class="w-44">
				<span class="mb-1.5 block text-sm font-semibold text-text-muted">Soort</span>
				<select class="input" bind:value={list.kind}>
					{#each LIST_KINDS as kind (kind)}<option value={kind}>{KIND_LABELS[kind]}</option>{/each}
				</select>
			</label>
			<label class="min-w-48 flex-1">
				<span class="mb-1.5 block text-sm font-semibold text-text-muted">Groep (optioneel)</span>
				<input class="input" bind:value={list.group} placeholder="bijv. Declinaties" />
			</label>
		</div>
	</details>

	{#if showTags}
		<div bind:this={dimensionPanel} class="rounded-tile bg-surface-2 p-3">
			<p class="mb-2 text-sm font-semibold text-text-muted">
				Dimensies <span class="font-medium">(de volgorde bepaalt de oefenstappen, bijv. eerst getal, dan naamval)</span>
			</p>
			<div class="flex flex-wrap items-center gap-2">
				{#each list.dimensions as dim, dimIndex (dim)}
					<span data-dim={dim} class="inline-flex items-center gap-0.5 rounded-full border border-border bg-surface pl-1">
						<button
							type="button"
							data-move="left"
							class="grid size-7 place-items-center rounded-full text-text-muted hover:text-text disabled:opacity-30"
							aria-label="Dimensie {dim} eerder zetten"
							title="Eerder (Alt + pijl links)"
							disabled={dimIndex === 0}
							onclick={() => moveDimension(dim, -1, 'left')}
						>
							<Icon name="chevron-left" size={16} />
						</button>
						<input
							class="w-24 bg-transparent py-1 text-sm font-semibold outline-none"
							value={dim}
							aria-label="Dimensie {dim}"
							onchange={(e) => renameDimension(e, dim)}
							onkeydown={(e) => onDimensionKeydown(e, dim)}
						/>
						<button
							type="button"
							data-move="right"
							class="grid size-7 place-items-center rounded-full text-text-muted hover:text-text disabled:opacity-30"
							aria-label="Dimensie {dim} later zetten"
							title="Later (Alt + pijl rechts)"
							disabled={dimIndex === list.dimensions.length - 1}
							onclick={() => moveDimension(dim, 1, 'right')}
						>
							<Icon name="chevron-right" size={16} />
						</button>
						<button type="button" class="grid size-7 place-items-center rounded-full text-text-muted hover:text-text" aria-label="Dimensie {dim} verwijderen" onclick={() => editor.removeDimension(list.id, dim)}>
							<Icon name="x" size={16} />
						</button>
					</span>
				{/each}
				<form class="flex items-center gap-2" onsubmit={(e) => { e.preventDefault(); addDimension(); }}>
					<input class="input !h-9 w-36 !py-0 text-sm" bind:value={dimensionName} placeholder="nieuwe dimensie" aria-label="Nieuwe dimensie" />
					<Button type="submit" variant="secondary" size="sm"><Icon name="plus" size={16} /> Toevoegen</Button>
				</form>
			</div>
			{#if dimensionError}<p class="mt-2 text-sm font-semibold text-rose-edge" role="alert">{dimensionError}</p>{/if}
		</div>
	{/if}

	<div bind:this={table} class="flex flex-col gap-2">
		<div class="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_5.5rem] items-end gap-2">
			<span></span>
			<input class="input h-9! py-0! text-sm font-semibold" bind:value={list.columns.prompt} aria-label="Naam van de eerste kolom" />
			<input class="input h-9! py-0! text-sm font-semibold" bind:value={list.columns.answer} aria-label="Naam van de tweede kolom" />
			<span></span>
		</div>

		{#each list.rows as row, index (row.id)}
			<div
				data-row={row.id}
				role="group"
				aria-label="Rij {index + 1}"
				class={['grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_5.5rem] items-start gap-2 rounded-tile', dragId === row.id && 'opacity-50']}
				ondragover={(e) => dragId && e.preventDefault()}
				ondrop={() => onDrop(row.id)}
			>
				<span
					class="mt-2 grid size-8 cursor-grab place-items-center rounded-md text-text-muted"
					draggable="true"
					role="img"
					aria-label="Sleep om te verplaatsen (of Alt + pijltje)"
					ondragstart={() => (dragId = row.id)}
					ondragend={() => (dragId = null)}
				>
					<Icon name="grip" size={20} />
				</span>
				{#if isConcept}
					<!-- An explanation or an example sentence is long: a textarea instead of a single line. -->
					<textarea
						class="input min-h-20"
						data-field="prompt"
						use:greekKeyboard={keyboard === 'greek'}
						bind:value={row.prompt}
						onkeydown={(e) => onCellKeydown(e, row.id)}
						aria-label="{list.columns.prompt}, rij {index + 1}"
						autocapitalize="none"
						spellcheck="false"
					></textarea>
				{:else}
					<input
						class="input"
						data-field="prompt"
						use:greekKeyboard={keyboard === 'greek'}
						bind:value={row.prompt}
						onkeydown={(e) => onCellKeydown(e, row.id)}
						aria-label="{list.columns.prompt}, rij {index + 1}"
						autocapitalize="none"
						spellcheck="false"
					/>
				{/if}
				<div class="flex flex-col gap-1.5">
					{#each row.answers as _, a (a)}
						<div class="flex items-center gap-1.5">
							<input
								class="input"
								data-field="answer"
								use:greekKeyboard={keyboard === 'greek'}
								bind:value={row.answers[a]}
								onkeydown={(e) => onCellKeydown(e, row.id)}
								aria-label={a === 0 ? `${list.columns.answer}, rij ${index + 1}` : `Variant ${a}, rij ${index + 1}`}
								placeholder={a === 0 ? '' : 'variant'}
								autocapitalize="none"
								spellcheck="false"
							/>
							{#if a > 0}
								<button type="button" class="grid size-8 shrink-0 place-items-center rounded-full text-text-muted hover:text-text" aria-label="Variant {a} verwijderen" onclick={() => row.answers.splice(a, 1)}>
									<Icon name="x" size={16} />
								</button>
							{/if}
						</div>
					{/each}
				</div>
				<div class="mt-1 flex gap-1">
					<Button variant="ghost" size="sm" iconOnly aria-label="Extra goed antwoord toevoegen, rij {index + 1}" title="Extra goed antwoord" onclick={() => row.answers.push('')}>
						<Icon name="plus" size={18} />
					</Button>
					<Button variant="ghost" size="sm" iconOnly aria-label="Rij {index + 1} verwijderen" title="Rij verwijderen" onclick={() => editor.removeRow(list.id, row.id)}>
						<Icon name="trash" size={18} />
					</Button>
				</div>

				{#if showTags && list.dimensions.length > 0}
					<div class="col-start-2 col-end-4 -mt-0.5 flex flex-wrap gap-2 pb-1">
						{#each list.dimensions as dim (dim)}
							<label class="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
								{dim}
								<input
									class="input h-8! w-24 px-2! py-0! text-sm"
									value={row.tags[dim] ?? ''}
									oninput={(e) => (row.tags[dim] = e.currentTarget.value)}
									autocapitalize="none"
									spellcheck="false"
								/>
							</label>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<div class="flex flex-wrap gap-2">
		<Button variant="secondary" size="sm" onclick={() => addRowAfter()}><Icon name="plus" size={16} /> Rij toevoegen</Button>
	</div>
</Card>