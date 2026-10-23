<script lang="ts">
	import Card from '../ui/Card.svelte';
	import Skeleton from '../ui/Skeleton.svelte';
</script>

<!-- Two stacks as direct children of the settings grid, like the loaded page (3 cards left, 2 right). -->
<span class="sr-only" role="status">Instellingen laden…</span>
{#each [3, 2] as count, column (column)}
	<div class="flex flex-col gap-5">
		{#each { length: count } as _, i (i)}
			<Card class="flex flex-col gap-4">
				<Skeleton class="h-6 w-1/3" />
				<Skeleton class="h-11 w-full" />
				<Skeleton class="h-11 w-full" />
			</Card>
		{/each}
	</div>
{/each}
