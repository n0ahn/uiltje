<script lang="ts">
	import Card from '../ui/Card.svelte';
	import Skeleton from '../ui/Skeleton.svelte';
</script>

<Card padded={false} class="overflow-hidden">
	<div class="divide-y divide-border" role="status" aria-busy="true">
		<span class="sr-only">Laden…</span>
		{#each { length: 3 } as _, i (i)}
			<div class="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5">
				<Skeleton class="size-10 shrink-0" />
				<Skeleton class="h-5 min-w-0 flex-1" />
				<Skeleton class="h-5 w-16" />
			</div>
		{/each}
	</div>
</Card>
