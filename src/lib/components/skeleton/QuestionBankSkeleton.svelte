<script lang="ts">
	import Card from '../ui/Card.svelte';
	import Skeleton from '../ui/Skeleton.svelte';
</script>

<!-- Mirrors the question bank: a list of items next to the questions of one item. -->
<div class="grid items-start gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]" role="status" aria-busy="true">
	<span class="sr-only">Laden…</span>
	<Card class="flex flex-col gap-2">
		{#each { length: 8 } as _, i (i)}
			<Skeleton class="h-11 w-full" />
		{/each}
	</Card>
	<Card class="flex flex-col gap-3">
		<Skeleton class="h-7 w-1/3" />
		<Skeleton class="h-4 w-full" />
		{#each { length: 3 } as _, i (i)}
			<Skeleton class="h-24 w-full" />
		{/each}
	</Card>
</div>
