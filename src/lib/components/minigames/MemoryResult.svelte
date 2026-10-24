<script lang="ts">
	import { formatClock } from '../../utils/time';
	import type { MemorySummary } from '../../engine/memory';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Confetti from '../ui/Confetti.svelte';
	import CountUp from '../ui/CountUp.svelte';
	import Icon from '../ui/Icon.svelte';
	import Owl from '../ui/Owl.svelte';
	import Nest from './art/Nest.svelte';
	import Stars from './art/Stars.svelte';

	// The end of Uilen-memory: all pairs are found. Shows how it went and offers the next step.
	type Props = {
		summary: MemorySummary;
		stars: 1 | 2 | 3;
		durationSeconds: number;
		/** Pairs that took many tries: the term and its answer. */
		trouble: { prompt: string; answer: string }[];
		backHref: string;
		hubHref: string;
		onrestart: () => void;
		/** Back to the start screen (other lists, other number of pairs). */
		onchange: () => void;
		/** Only the tricky pairs; null when there are fewer than two. */
		onretry: (() => void) | null;
	};
	let { summary, stars, durationSeconds, trouble, backHref, hubHref, onrestart, onchange, onretry }: Props = $props();

	const perfect = $derived(summary.pairs > 0 && summary.firstTry === summary.pairs);
</script>

{#if perfect}<Confetti />{/if}

<div class="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 py-8 text-center">
	<div class="flex items-end gap-2">
		<Owl pose={perfect ? 'cheer' : 'happy'} size={104} bob={perfect} />
		<Nest owls={4} size={96} />
	</div>
	<h1 class="font-heading text-3xl font-semibold">{perfect ? 'Alle paren zonder missers!' : 'Alle paren gevonden!'}</h1>
	<Stars filled={stars} />

	<Card class="grid w-full grid-cols-2 gap-3 text-center sm:grid-cols-4">
		<div><p class="font-heading text-3xl font-bold"><CountUp value={summary.pairs} /></p><p class="text-sm text-text-muted">Paren</p></div>
		<div><p class="font-heading text-3xl font-bold"><CountUp value={summary.moves} /></p><p class="text-sm text-text-muted">Pogingen</p></div>
		<div><p class="font-heading text-3xl font-bold"><CountUp value={summary.bestStreak} /></p><p class="text-sm text-text-muted">Langste reeks</p></div>
		<div><p class="font-heading text-3xl font-bold">{formatClock(durationSeconds)}</p><p class="text-sm text-text-muted">Speeltijd</p></div>
	</Card>

	{#if trouble.length > 0}
		<Card class="w-full text-left">
			<h2 class="font-heading text-lg font-semibold">Deze paren waren lastig</h2>
			<ul class="mt-2 flex flex-col divide-y divide-border">
				{#each trouble as item, i (i)}
					<li class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2">
						<span class="font-semibold">{item.prompt}</span>
						<span class="text-text-muted">{item.answer}</span>
					</li>
				{/each}
			</ul>
		</Card>
	{/if}

	<div class="flex flex-wrap justify-center gap-3">
		{#if onretry}<Button size="lg" onclick={onretry}><Icon name="repeat" size={20} /> Alleen de lastige paren</Button>{/if}
		<Button variant={onretry ? 'secondary' : 'primary'} size="lg" onclick={onrestart}>Nog een keer</Button>
		<Button variant="ghost" size="lg" onclick={onchange}>Andere keuze</Button>
		<Button variant="ghost" size="lg" href={hubHref}>Andere game</Button>
		<Button variant="ghost" size="lg" href={backHref}>Klaar</Button>
	</div>
</div>
