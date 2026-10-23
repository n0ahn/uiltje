<script lang="ts">
	import Card from '../ui/Card.svelte';
	import Skeleton from '../ui/Skeleton.svelte';
</script>

<!-- Mirrors the suggestions page: a switch and a few suggestion cards. -->
<div class="flex flex-col gap-4" role="status" aria-busy="true">
	<span class="sr-only">Laden…</span>
	<Skeleton class="h-11 w-full max-w-sm" />
	{#each { length: 3 } as _, i (i)}
		<Card class="flex flex-col gap-3">
			<div class="flex items-center justify-between gap-3">
				<Skeleton class="h-6 w-1/3" />
				<Skeleton class="h-6 w-24" />
			</div>
			<Skeleton class="h-4 w-full" />
			<Skeleton class="h-4 w-2/3" />
		</Card>
	{/each}
</div>
