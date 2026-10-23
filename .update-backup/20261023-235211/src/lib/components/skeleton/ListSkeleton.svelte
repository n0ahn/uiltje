<script lang="ts">
	import Card from '../ui/Card.svelte';
	import Skeleton from '../ui/Skeleton.svelte';

	/** A card with a heading and rows of avatar + two text lines (people, shares). */
	type Props = { rows?: number; class?: string };
	let { rows = 3, class: className = '' }: Props = $props();
</script>

<Card class="flex flex-col gap-4 {className}" aria-hidden="true">
	<Skeleton class="h-6 w-1/3" />
	{#each { length: rows } as _, i (i)}
		<div class="flex items-center gap-3">
			<Skeleton class="size-10 shrink-0 rounded-full!" />
			<div class="flex min-w-0 flex-1 flex-col gap-2">
				<Skeleton class="h-4 w-1/2" />
				<Skeleton class="h-3 w-1/3" />
			</div>
			<Skeleton class="h-9 w-24" />
		</div>
	{/each}
</Card>
