<script lang="ts">
	import type { DayActivity } from '../../stats/stats';

	// Bars per day, soft sage with rounded tops and a faint baseline (DESIGN §6.10). Every day is a list item
	// with a text label, so the numbers are readable without hovering.
	type Props = { days: DayActivity[] };
	let { days }: Props = $props();

	const max = $derived(Math.max(...days.map((d) => d.answers), 1));
	const total = $derived(days.reduce((sum, d) => sum + d.answers, 0));
	const dayName = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
	const label = (d: DayActivity) => `${dayName.format(d.date)}: ${d.answers === 0 ? 'niet geoefend' : `${d.answers} antwoorden`}`;
</script>

<ul class="flex h-44 items-end gap-1 border-b border-border pb-0 sm:gap-1.5" aria-label="Antwoorden per dag, {total} in totaal">
	{#each days as d (d.key)}
		<li class="group flex h-full min-w-0 flex-1 flex-col justify-end" title={label(d)} aria-label={label(d)}>
			<span
				class={['w-full rounded-t-md transition-[height] duration-400 ease-cozy', d.answers > 0 ? 'bg-sage group-hover:bg-primary' : 'bg-surface-2']}
				style:height="{d.answers > 0 ? Math.max((d.answers / max) * 100, 4) : 3}%"
			></span>
		</li>
	{/each}
</ul>
<ul class="mt-1.5 flex gap-1 sm:gap-1.5" aria-hidden="true">
	{#each days as d (d.key)}
		<li class="min-w-0 flex-1 text-center text-[0.65rem] font-semibold text-text-muted sm:text-xs">{d.date.getDate()}</li>
	{/each}
</ul>
