<script lang="ts">
	import { formatClock } from '../../utils/time';
	import type { CatchSummary } from '../../engine/catch';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Confetti from '../ui/Confetti.svelte';
	import CountUp from '../ui/CountUp.svelte';
	import Icon from '../ui/Icon.svelte';
	import Owl from '../ui/Owl.svelte';
	import Nest from './art/Nest.svelte';
	import Stars from './art/Stars.svelte';

	// The end of Uilenvangst: all owls are in the nest. Shows how it went and offers the next step.
	type Props = {
		summary: CatchSummary;
		stars: 1 | 2 | 3;
		durationSeconds: number;
		/** Owls that were missed the first time they fell: what is on the card and what the answer was. */
		trouble: { prompt: string; answer: string }[];
		backHref: string;
		hubHref: string;
		onrestart: () => void;
		/** Back to the start screen (other lists, speed). */
		onchange: () => void;
		/** Only the owls that were missed; null when there were none. */
		onretry: (() => void) | null;
	};
	let { summary, stars, durationSeconds, trouble, backHref, hubHref, onrestart, onchange, onretry }: Props = $props();

	const percent = $derived(summary.total === 0 ? 0 : Math.round((summary.firstTry / summary.total) * 100));
	const perfect = $derived(summary.total > 0 && summary.missed === 0);
</script>

{#if perfect}<Confetti />{/if}

<div class="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 py-8 text-center">
	{#if summary.total === 0}
		<Owl pose="sleepy" size={104} />
		<h1 class="font-heading text-3xl font-semibold">Geen uilen om te vangen</h1>
		<p class="max-w-md text-text-muted">Met deze keuze zijn er te weinig onderdelen met een kort antwoord. Kies andere lijsten, of meer dan één.</p>
	{:else}
		<div class="flex items-end gap-2">
			<Owl pose={perfect ? 'cheer' : 'happy'} size={104} bob={perfect} />
			<Nest owls={4} size={96} />
		</div>
		<h1 class="font-heading text-3xl font-semibold">{perfect ? 'Alle uilen in één keer gevangen!' : 'Alle uilen gevangen!'}</h1>
		<Stars filled={stars} />

		<Card class="grid w-full grid-cols-2 gap-3 text-center sm:grid-cols-4">
			<div><p class="font-heading text-3xl font-bold"><CountUp value={summary.total} /></p><p class="text-sm text-text-muted">Uilen</p></div>
			<div><p class="font-heading text-3xl font-bold"><CountUp value={percent} />%</p><p class="text-sm text-text-muted">Meteen goed</p></div>
			<div><p class="font-heading text-3xl font-bold"><CountUp value={summary.bestStreak} /></p><p class="text-sm text-text-muted">Langste reeks</p></div>
			<div><p class="font-heading text-3xl font-bold">{formatClock(durationSeconds)}</p><p class="text-sm text-text-muted">Speeltijd</p></div>
		</Card>

		{#if trouble.length > 0}
			<Card class="w-full text-left">
				<h2 class="font-heading text-lg font-semibold">Deze uilen waren lastig</h2>
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
	{/if}

	<div class="flex flex-wrap justify-center gap-3">
		{#if onretry}<Button size="lg" onclick={onretry}><Icon name="repeat" size={20} /> Alleen de lastige uilen</Button>{/if}
		<Button variant={onretry ? 'secondary' : 'primary'} size="lg" onclick={onrestart}>Nog een keer</Button>
		<Button variant="ghost" size="lg" onclick={onchange}>Andere keuze</Button>
		<Button variant="ghost" size="lg" href={hubHref}>Andere game</Button>
		<Button variant="ghost" size="lg" href={backHref}>Klaar</Button>
	</div>
</div>
