<script lang="ts">
	import { catchPool, type CatchDirection } from '../../engine/catch';
	import { selectRows } from '../../engine/options';
	import type { StudySet } from '../../schema/types';
	import { settings } from '../../state/settings.svelte';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Icon from '../ui/Icon.svelte';
	import Owl from '../ui/Owl.svelte';
	import Segmented from '../ui/Segmented.svelte';
	import { CONCEPT_DIRECTION_OPTIONS, DIRECTION_OPTIONS, VOCAB_DIRECTION_OPTIONS } from '../practice/config';
	import { COUNT_CHOICES, SPEED_OPTIONS, type CatchConfig } from './config';

	// Start screen of Uilenvangst: which lists, which direction. The rest is under "Meer opties".
	type Props = { sets: StudySet[]; title: string; hubHref: string; onstart: (config: CatchConfig) => void };
	let { sets, title, hubHref, onstart }: Props = $props();

	// svelte-ignore state_referenced_locally
	let direction = $state<CatchDirection>(settings.value.practice.direction);
	// svelte-ignore state_referenced_locally
	let selection = $state<Record<string, string[]>>(
		Object.fromEntries(sets.map((set) => [set.id, set.lists.filter((l) => l.rows.length > 0).map((l) => l.id)]))
	);
	let speed = $state<CatchConfig['speed']>('normal');
	let count = $state<'10' | '20' | '30' | 'all'>('20');

	const rows = $derived(selectRows(sets, selection, { strictness: 'set', onlyRowKeys: null }));
	const pool = $derived(catchPool(rows, direction));
	const lists = $derived(sets.flatMap((set) => set.lists.filter((l) => selection[set.id]?.includes(l.id))));
	const onlyConcepts = $derived(lists.length > 0 && lists.every((l) => l.kind === 'concept'));
	const onlyRijtjes = $derived(lists.length > 0 && lists.every((l) => !(l.kind === 'vocab' || l.kind === 'concept')));
	const directionOptions = $derived(
		onlyRijtjes ? DIRECTION_OPTIONS.map((o) => ({ id: o.id, name: o.name })) : onlyConcepts ? CONCEPT_DIRECTION_OPTIONS : VOCAB_DIRECTION_OPTIONS
	);
	const countOptions = [...COUNT_CHOICES.map((n) => ({ id: String(n) as '10' | '20' | '30', name: String(n) })), { id: 'all' as const, name: 'Alles' }];
	const owls = $derived(count === 'all' ? pool.playable : Math.min(pool.playable, Number(count)));
	const tooFew = $derived(pool.playable < 2);

	function toggle(setId: string, listId: string) {
		const current = selection[setId] ?? [];
		selection[setId] = current.includes(listId) ? current.filter((id) => id !== listId) : [...current, listId];
	}
</script>

<svelte:head><title>Uilenvangst · {title} · Uiltje</title></svelte:head>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-4">
	<div class="flex items-center gap-3">
		<Button href={hubHref} variant="ghost" size="sm" iconOnly aria-label="Terug naar de minigames"><Icon name="arrow-left" size={20} /></Button>
		<div class="min-w-0 flex-1">
			<h1 class="truncate font-heading text-2xl font-semibold">Uilenvangst</h1>
			<p class="truncate text-text-muted">{title}</p>
		</div>
		<Owl pose="cheer" size={52} />
	</div>

	<Card class="flex flex-col gap-5 sm:p-8">
		<p class="text-text-muted">De uilen vallen uit de boom, elk met een antwoord. Beweeg je mand onder de uil met het goede antwoord en laat hem vallen. Een uil die je mist, komt later terug: het spel is klaar als alle uilen zijn gevangen.</p>

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

		<Segmented legend="Richting" stack options={directionOptions} bind:value={direction} />

		<details class="rounded-tile bg-surface-2 px-3 py-2">
			<summary class="cursor-pointer text-sm font-semibold text-text-muted">Meer opties</summary>
			<div class="mt-3 flex flex-col gap-5 pb-2">
				<Segmented legend="Aantal uilen" options={countOptions} bind:value={count} />
				<Segmented legend="Snelheid" stack options={SPEED_OPTIONS} bind:value={speed} />
			</div>
		</details>

		<div class="flex flex-col gap-2">
			<Button
				size="lg"
				class="w-full"
				disabled={tooFew}
				onclick={() => onstart({ selection, direction, count: count === 'all' ? null : Number(count), speed, onlyRowKeys: null })}
			>
				<Icon name="play" size={20} /> Start
			</Button>
			<p class="min-h-6 text-center text-sm text-text-muted" aria-live="polite">
				{#if tooFew}
					Kies lijsten met minstens 2 onderdelen met een kort antwoord.
				{:else}
					{owls} {owls === 1 ? 'uil' : 'uilen'}{#if pool.tooLong > 0} · {pool.tooLong} {pool.tooLong === 1 ? 'onderdeel doet' : 'onderdelen doen'} niet mee (antwoord te lang){/if}
				{/if}
			</p>
		</div>
	</Card>
</div>
