<script lang="ts">
	import type { DayActivity } from '../../stats/stats';

	// Bars per day, soft sage with rounded tops and a faint baseline (DESIGN §6.10). Every day is a list item
	// with a text label, so the numbers are readable without hovering.
	type Props = { days: DayActivity[] };
	let { days }: Props = $props();

	const max = $derived(Math.max(...days.map((d) => d.answers), 1));
	const total = $derived(days.reduce((sum, d) => sum + d.answers, 0));
	// Show about seven date labels, however many days there are, so they stay readable on a phone.
	const step = $derived(Math.max(1, Math.ceil(days.length / 7)));
	const dayName = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
	const label = (d: DayActivity) => `${dayName.format(d.date)}: ${d.answers === 0 ? 'niet geoefend' : `${d.answers} antwoorden`}`;
</script>

<ul class="flex h-44 items-end gap-1 border-b border-border pb-0 sm:gap-1.5" aria-label="Antwoorden per dag, {total} in totaal">
	{#each days as d, i (d.key)}
		<li class="group flex h-full min-w-0 flex-1 flex-col justify-end" title={label(d)} aria-label={label(d)}>
			<span
				class={['grow-y w-full rounded-t-md', d.answers > 0 ? 'bg-sage group-hover:bg-primary' : 'bg-surface-2']}
				style:--h="{d.answers > 0 ? Math.max((d.answers / max) * 100, 4) : 3}%"
				style:--i={Math.min(i, 20) * 0.6}
			></span>
		</li>
	{/each}
</ul>
<ul class="mt-1.5 flex gap-1 sm:gap-1.5" aria-hidden="true">
	{#each days as d, i (d.key)}
		<li class="min-w-0 flex-1 text-center text-xs font-semibold whitespace-nowrap text-text-muted">{i % step === 0 ? d.date.getDate() : ''}</li>
	{/each}
</ul>
