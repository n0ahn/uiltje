<script lang="ts">
	import Card from '../ui/Card.svelte';
	import Icon from '../ui/Icon.svelte';
	import Skeleton from '../ui/Skeleton.svelte';

	type Props = { days: number; week: { day: string; amount: number }[]; loading?: boolean };
	let { days, week, loading = false }: Props = $props();
</script>

<Card>
	<h3 class="flex items-center gap-2">
		Streak <Icon name="flame" size={20} class="text-flame" />
	</h3>
	{#if loading}
		<Skeleton class="mt-2 h-9 w-28" />
	{:else}
		<p class="mt-1 font-heading text-4xl font-bold">{days} {days === 1 ? 'dag' : 'dagen'}</p>
	{/if}
	<p class="mt-1 text-sm text-text-muted">Blijf oefenen om je reeks te houden.</p>

	<ul class="mt-4 flex h-20 items-end gap-2" aria-label="Oefeningen deze week">
		{#each week as item (item.day)}
			<li class="flex h-full flex-1 flex-col items-center justify-end gap-1">
				<span
					class={['w-full max-w-5 rounded-md', item.amount > 0 ? 'bg-flame' : 'bg-surface-2']}
					style:height="{Math.max(item.amount, 0.12) * 100}%"
					title={item.amount > 0 ? `${item.day}: geoefend` : `${item.day}: niet geoefend`}
				></span>
				<span class="text-[0.7rem] font-semibold text-text-muted">{item.day}</span>
			</li>
		{/each}
	</ul>
</Card>