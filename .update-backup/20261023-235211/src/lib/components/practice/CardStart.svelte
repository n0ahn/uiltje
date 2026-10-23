<script lang="ts">
	import { onMount } from 'svelte';
	import type { CardMode } from '../../engine/cards';
	import { selectRows } from '../../engine/options';
	import type { StudySet } from '../../schema/types';
	import { settings } from '../../state/settings.svelte';
	import { canSpeak } from '../../utils/speech';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Icon from '../ui/Icon.svelte';
	import Segmented from '../ui/Segmented.svelte';
	import { CARD_MODE_INFO, VOCAB_DIRECTION_OPTIONS, type CardConfig } from './config';

	// Start screen of the single-pass modes: which lists, which direction. Short on purpose: pick and go.
	type Props = { sets: StudySet[]; title: string; backHref: string; mode: CardMode; onstart: (config: CardConfig) => void };
	let { sets, title, backHref, mode, onstart }: Props = $props();

	const info = $derived(CARD_MODE_INFO[mode]);
	// svelte-ignore state_referenced_locally
	let direction = $state<CardConfig['direction']>(settings.value.practice.direction);
	// svelte-ignore state_referenced_locally
	let selection = $state<Record<string, string[]>>(
		Object.fromEntries(sets.map((set) => [set.id, set.lists.filter((l) => l.rows.length > 0).map((l) => l.id)]))
	);
	let speech = $state(true);
	onMount(() => (speech = canSpeak()));

	const rows = $derived(selectRows(sets, selection, { strictness: 'set', onlyRowKeys: null }));
	const tooFew = $derived(mode === 'choice' && rows.length < 2);

	function toggle(setId: string, listId: string) {
		const current = selection[setId] ?? [];
		selection[setId] = current.includes(listId) ? current.filter((id) => id !== listId) : [...current, listId];
	}
</script>

<svelte:head><title>{info.name} · {title} · Uiltje</title></svelte:head>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-4">
	<div class="flex items-center gap-3">
		<Button href={backHref} variant="ghost" size="sm" iconOnly aria-label="Terug"><Icon name="arrow-left" size={20} /></Button>
		<div class="min-w-0 flex-1">
			<h1 class="truncate font-heading text-2xl font-semibold">{info.name}</h1>
			<p class="truncate text-text-muted">{title}</p>
		</div>
	</div>

	<Card class="flex flex-col gap-5 sm:p-8">
		<p class="text-text-muted">{info.text}</p>

		{#if mode === 'dictation' && !speech}
			<p class="rounded-tile bg-rose-soft p-3 font-semibold" role="alert">Je browser kan geen tekst voorlezen, dus dictee werkt hier niet. Probeer Chrome, Edge of Safari.</p>
		{/if}

		<fieldset class="flex flex-col gap-2">
			<legend class="mb-1 text-sm font-semibold text-text-muted">Welke lijsten?</legend>
			{#each sets as set (set.id)}
				{#if sets.length > 1}<p class="font-heading font-semibold">{set.title}</p>{/if}
				<ul class="flex flex-wrap gap-2">
					{#each set.lists.filter((l) => l.rows.length > 0) as list (list.id)}
						{@const on = selection[set.id]?.includes(list.id) ?? false}
						<li>
							<label
								class={[
									'inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-3 text-sm font-semibold has-focus-visible:outline-3 has-focus-visible:outline-primary/50',
									on ? 'border-primary bg-primary-soft text-primary-text' : 'border-border bg-surface text-text-muted'
								]}
							>
								<input type="checkbox" class="sr-only" checked={on} onchange={() => toggle(set.id, list.id)} />
								{list.title.trim() || 'Naamloze lijst'} <span class="font-normal">({list.rows.length})</span>
							</label>
						</li>
					{/each}
				</ul>
			{/each}
		</fieldset>

		{#if mode !== 'dictation'}
			<Segmented legend="Richting" options={VOCAB_DIRECTION_OPTIONS} bind:value={direction} />
		{/if}

		<div class="flex flex-wrap items-center gap-3">
			<Button size="lg" class="min-w-44" disabled={rows.length === 0 || tooFew || (mode === 'dictation' && !speech)} onclick={() => onstart({ mode, selection, direction, onlyRowKeys: null })}>
				<Icon name="play" size={20} /> Start
			</Button>
			<p class="text-sm text-text-muted" aria-live="polite">
				{#if tooFew}Kies minstens 2 onderdelen voor meerkeuze.{:else}{rows.length} {rows.length === 1 ? 'onderdeel' : 'onderdelen'}{/if}
			</p>
		</div>
	</Card>
</div>
