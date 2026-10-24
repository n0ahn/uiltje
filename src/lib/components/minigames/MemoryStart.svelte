<script lang="ts">
	import { memoryPool } from '../../engine/memory';
	import { selectRows } from '../../engine/options';
	import type { StudySet } from '../../schema/types';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Icon from '../ui/Icon.svelte';
	import Owl from '../ui/Owl.svelte';
	import Segmented from '../ui/Segmented.svelte';
	import { PAIR_CHOICES, type MemoryConfig } from './config';

	// Start screen of Uilen-memory: which lists and how many pairs.
	type Props = { sets: StudySet[]; title: string; hubHref: string; onstart: (config: MemoryConfig) => void };
	let { sets, title, hubHref, onstart }: Props = $props();

	// svelte-ignore state_referenced_locally
	let selection = $state<Record<string, string[]>>(
		Object.fromEntries(sets.map((set) => [set.id, set.lists.filter((l) => l.rows.length > 0).map((l) => l.id)]))
	);
	let pairs = $state<'6' | '8' | '10' | '12'>('8');

	const rows = $derived(selectRows(sets, selection, { strictness: 'set', onlyRowKeys: null }));
	const pool = $derived(memoryPool(rows));
	const pairOptions = PAIR_CHOICES.map((n) => ({ id: String(n) as '6' | '8' | '10' | '12', name: String(n) }));
	const playing = $derived(Math.min(pool.usable.length, Number(pairs)));
	const tooFew = $derived(pool.usable.length < 2);

	function toggle(setId: string, listId: string) {
		const current = selection[setId] ?? [];
		selection[setId] = current.includes(listId) ? current.filter((id) => id !== listId) : [...current, listId];
	}
</script>

<svelte:head><title>Uilen-memory · {title} · Uiltje</title></svelte:head>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-4">
	<div class="flex items-center gap-3">
		<Button href={hubHref} variant="ghost" size="sm" iconOnly aria-label="Terug naar de minigames"><Icon name="arrow-left" size={20} /></Button>
		<div class="min-w-0 flex-1">
			<h1 class="truncate font-heading text-2xl font-semibold">Uilen-memory</h1>
			<p class="truncate text-text-muted">{title}</p>
		</div>
		<Owl pose="cheer" size={52} />
	</div>

	<Card class="flex flex-col gap-5 sm:p-8">
		<p class="text-text-muted">Alle bladeren liggen met hun rug naar boven. Draai er twee om: horen ze bij elkaar, een term en zijn antwoord, dan blijven ze open. Zo niet, dan draaien ze terug. Je bent klaar als je alle paren hebt gevonden.</p>

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

		<Segmented legend="Aantal paren" options={pairOptions} bind:value={pairs} />

		<div class="flex flex-col gap-2">
			<Button size="lg" class="w-full" disabled={tooFew} onclick={() => onstart({ selection, pairs: Number(pairs), onlyRowKeys: null })}>
				<Icon name="play" size={20} /> Start
			</Button>
			<p class="min-h-6 text-center text-sm text-text-muted" aria-live="polite">
				{#if tooFew}
					Kies lijsten met minstens 2 onderdelen met een kort, eigen antwoord.
				{:else}
					{playing} {playing === 1 ? 'paar' : 'paren'}{#if pool.skipped > 0} · {pool.skipped} {pool.skipped === 1 ? 'onderdeel doet' : 'onderdelen doen'} niet mee (te lang of dubbel){/if}
				{/if}
			</p>
		</div>
	</Card>
</div>
