<script lang="ts">
	import { goto } from '$app/navigation';
	import { buildPaletteItems } from '../../palette/items';
	import { segments, type Range } from '../../palette/search';
	import { buildSections } from '../../palette/sections';
	import type { PaletteItem } from '../../palette/types';
	import { overview } from '../../state/overview.svelte';
	import { palette } from '../../state/palette.svelte';
	import { isApplePlatform } from '../../utils/platform';
	import { accentStyle } from '../ui/accent';
	import Avatar from '../ui/Avatar.svelte';
	import Button from '../ui/Button.svelte';
	import Icon from '../ui/Icon.svelte';
	import Owl from '../ui/Owl.svelte';

	// Command palette (⌘K / Ctrl+K): search sets, vakken, friends and pages, or run a quick action.
	// A native <dialog> gives us the top layer, Esc, the backdrop and a focus trap; the input is a
	// combobox and the options are never focused themselves (aria-activedescendant), so typing always works.

	let dialog: HTMLDialogElement | undefined = $state();
	let input: HTMLInputElement | undefined = $state();
	let list: HTMLDivElement | undefined = $state();
	let query = $state('');
	let active = $state(0);

	const uid = $props.id();
	const listId = `palette-list-${uid}`;
	const optionId = (index: number) => `palette-option-${uid}-${index}`;

	const items = $derived(buildPaletteItems(overview.data));
	const sections = $derived(buildSections(items, query));

	// Number every row so the keyboard can walk through all sections as one flat list.
	const view = $derived.by(() => {
		let index = 0;
		return sections.map((section) => ({
			...section,
			entries: section.entries.map((entry) => ({ ...entry, index: index++ }))
		}));
	});
	const flat = $derived(view.flatMap((section) => section.entries));
	const count = $derived(flat.length);

	// Keep the native <dialog> in sync with the shared open state (Esc and backdrop clicks end up in palette.hide();
	// `cancel` fires right when Esc is pressed, `close` comes a moment later, so a quick Esc, Ctrl+K never sees a stale state).
	$effect(() => {
		if (!dialog) return;
		if (palette.open && !dialog.open) {
			query = '';
			active = 0;
			dialog.showModal();
			void overview.load(60_000);
			if (list) list.scrollTop = 0;
			input?.focus();
		} else if (!palette.open && dialog.open) {
			dialog.close();
		}
	});

	// Keep the selected row visible while walking through a long list.
	$effect(() => {
		if (!palette.open) return;
		if (active === 0 && list) list.scrollTop = 0;
		else document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
	});

	function onWindowKeydown(event: KeyboardEvent) {
		if (event.isComposing || event.altKey || event.shiftKey) return;
		// With a Greek (or other non-Latin) keyboard layout the K key does not produce "k", so fall back to the physical key.
		const isK = event.key.toLowerCase() === 'k' || (!/^[a-z]$/i.test(event.key) && event.code === 'KeyK');
		if (!isK) return;
		// ⌘K on Apple, Ctrl+K elsewhere (Ctrl+K is "delete to end of line" in Mac text fields, so we leave it alone there).
		const modifier = isApplePlatform() ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
		if (!modifier) return;
		event.preventDefault();
		palette.toggle();
	}

	function move(delta: number, wrap = true) {
		if (count === 0) return;
		active = wrap ? (active + delta + count) % count : Math.min(count - 1, Math.max(0, active + delta));
	}

	function onInputKeydown(event: KeyboardEvent) {
		if (event.isComposing) return;
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				move(1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				move(-1);
				break;
			case 'PageDown':
				event.preventDefault();
				move(5, false);
				break;
			case 'PageUp':
				event.preventDefault();
				move(-5, false);
				break;
			case 'Enter': {
				event.preventDefault();
				const entry = flat[active];
				if (entry) choose(entry.item);
				break;
			}
		}
	}

	async function go(href: string) {
		try {
			await goto(href);
		} catch {
			// goto() refuses URLs that are not routes (yet), e.g. pages from later phases.
			// A normal page load shows the 404 page, just like the sidebar links do today.
			window.location.assign(href);
		}
	}

	function choose(item: PaletteItem) {
		palette.hide();
		if (item.run) item.run();
		else if (item.href) void go(item.href);
	}

	// Only a real mouse moves the selection (a touch scroll must not).
	function onPointerMove(event: PointerEvent, index: number) {
		if (event.pointerType === 'mouse' && active !== index) active = index;
	}

	function onDialogClick(event: MouseEvent) {
		// A click on the backdrop lands on the <dialog> itself (it has no padding).
		if (event.target === dialog) palette.hide();
	}
</script>

{#snippet highlighted(text: string, ranges: readonly Range[])}
	{#each segments(text, ranges) as part, i (i)}{#if part.match}<mark
				class="rounded-sm bg-[color-mix(in_srgb,var(--color-primary)_24%,transparent)] text-inherit">{part.text}</mark
			>{:else}{part.text}{/if}{/each}
{/snippet}

<svelte:window onkeydown={onWindowKeydown} />

<!-- Esc is handled natively by <dialog>; the backdrop click is a convenience on top. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialog}
	aria-label="Zoeken en snelle acties"
	oncancel={() => palette.hide()}
	onclose={() => {
		// A late `close` event of an earlier Esc must not close a palette that was just reopened.
		if (dialog && !dialog.open) palette.hide();
	}}
	onclick={onDialogClick}
	class="m-auto max-h-[calc(100dvh-2rem)] w-[min(40rem,calc(100vw-2rem))] max-w-none overflow-hidden rounded-panel border border-border bg-surface p-0 text-text shadow-card backdrop:bg-[rgb(36_28_25/0.45)] backdrop:backdrop-blur-[2px] open:animate-[pop-in_180ms_var(--ease-cozy)] max-sm:mt-4"
>
	<div class="flex items-center gap-3 border-b border-border px-4 py-3 focus-within:border-primary">
		<Icon name="search" size={20} class="text-text-muted" />
		<input
			bind:this={input}
			bind:value={query}
			oninput={() => {
				active = 0;
				if (list) list.scrollTop = 0;
			}}
			onkeydown={onInputKeydown}
			type="text"
			role="combobox"
			aria-expanded="true"
			aria-controls={listId}
			aria-autocomplete="list"
			aria-activedescendant={count > 0 ? optionId(active) : undefined}
			aria-label="Zoek sets, vakken of vrienden"
			placeholder="Zoek sets, vakken of vrienden…"
			autocomplete="off"
			autocapitalize="none"
			spellcheck="false"
			enterkeyhint="go"
			class="min-w-0 flex-1 bg-transparent py-1 font-body text-lg font-semibold text-text outline-none placeholder:font-medium placeholder:text-text-muted"
		/>
		<Button variant="ghost" size="sm" iconOnly class="sm:hidden" aria-label="Sluiten" onclick={() => palette.hide()}>
			<Icon name="x" size={20} />
		</Button>
	</div>

	<!-- Fixed height: the dialog stays centred and does not jump while the number of results changes. -->
	<div bind:this={list} class="h-[min(26rem,55dvh)] overflow-y-auto overscroll-contain p-2">
		<p class="sr-only" role="status">{count === 0 ? 'Geen resultaten' : `${count} resultaten`}</p>

		<div id={listId} role="listbox" aria-label="Resultaten">
			{#each view as section, sectionIndex (section.group)}
				<div role="group" aria-labelledby="{listId}-{section.group}">
					<p
						id="{listId}-{section.group}"
						class={[
							'px-3 pb-1.5 font-heading text-xs font-semibold tracking-wider text-text-muted uppercase',
							sectionIndex === 0 ? 'pt-1' : 'pt-3'
						]}
					>
						{section.label}
					</p>

					{#each section.entries as entry (entry.item.id)}
						{@const item = entry.item}
						{@const selected = entry.index === active}
						<!-- Options are not focusable (the input keeps focus); mousedown must not steal it. -->
						<div
							id={optionId(entry.index)}
							role="option"
							tabindex="-1"
							aria-selected={selected}
							style={item.accent ? accentStyle(item.accent) : undefined}
							class={[
								'flex scroll-mt-9 scroll-mb-2 cursor-pointer items-center gap-3 rounded-tile px-3 py-2',
								selected && 'bg-primary-soft'
							]}
							onclick={() => choose(item)}
							onmousedown={(event) => event.preventDefault()}
							onpointermove={(event) => onPointerMove(event, entry.index)}
						>
							{#if item.avatar}
								<Avatar name={item.avatar} size={36} />
							{:else}
								<span
									class={[
										'grid size-9 shrink-0 place-items-center rounded-tile',
										item.accent
											? 'bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-(--accent)'
											: 'bg-surface-2 text-text-muted'
									]}
								>
									<Icon name={item.icon} size={20} />
								</span>
							{/if}

							<span class="min-w-0 flex-1">
								<span class={['block truncate font-semibold', selected && 'text-primary-text']}>
									{@render highlighted(item.title, entry.ranges)}
								</span>
								{#if item.subtitle}
									<span class="block truncate text-sm text-text-muted">{item.subtitle}</span>
								{/if}
							</span>

							{#if selected}
								<kbd class="hidden rounded-md bg-surface px-1.5 py-0.5 font-body text-xs font-semibold text-text-muted sm:inline-flex" aria-hidden="true">↵</kbd>
							{/if}
						</div>
					{/each}
				</div>
			{/each}
		</div>

		{#if count === 0}
			<div class="grid h-full place-items-center px-6 text-center">
				<div class="flex flex-col items-center gap-2">
					<Owl pose="sleepy" size={64} />
					<p class="font-heading text-lg font-semibold wrap-anywhere">Niets gevonden voor “{query.trim()}”</p>
					<p class="text-sm text-text-muted">Probeer een kortere zoekterm, of maak er zelf een set van.</p>
					<a href="/sets/new" class="btn mt-2" data-size="sm" onclick={() => palette.hide()}>Nieuwe set maken</a>
				</div>
			</div>
		{/if}
	</div>

	<div class="hidden items-center gap-4 border-t border-border px-4 py-2.5 text-xs text-text-muted sm:flex" aria-hidden="true">
		<span class="flex items-center gap-1.5"><kbd class="rounded-md bg-surface-2 px-1.5 py-0.5 font-semibold">↑</kbd><kbd class="rounded-md bg-surface-2 px-1.5 py-0.5 font-semibold">↓</kbd> navigeren</span>
		<span class="flex items-center gap-1.5"><kbd class="rounded-md bg-surface-2 px-1.5 py-0.5 font-semibold">↵</kbd> openen</span>
		<span class="flex items-center gap-1.5"><kbd class="rounded-md bg-surface-2 px-1.5 py-0.5 font-semibold">Esc</kbd> sluiten</span>
	</div>
</dialog>