<script lang="ts">
	import Card from '../ui/Card.svelte';
	import Skeleton from '../ui/Skeleton.svelte';
</script>

<!-- Four cards as direct children of the settings grid, so they take the grid's cells. -->
<span class="sr-only" role="status">Instellingen laden…</span>
{#each { length: 4 } as _, i (i)}
	<Card class="flex flex-col gap-4">
		<Skeleton class="h-6 w-1/3" />
		<Skeleton class="h-11 w-full" />
		<Skeleton class="h-11 w-full" />
	</Card>
{/each}
