<script lang="ts">
	import Card from '../ui/Card.svelte';
	import Skeleton from '../ui/Skeleton.svelte';
</script>

<!-- Mirrors the challenges page: a few challenge cards with a person row and two score lines. -->
<div class="flex flex-col gap-4" role="status" aria-busy="true">
	<span class="sr-only">Laden…</span>
	{#each { length: 3 } as _, i (i)}
		<Card class="flex flex-col gap-3">
			<div class="flex items-center gap-3">
				<Skeleton class="size-10 rounded-full" />
				<Skeleton class="h-5 w-1/3" />
			</div>
			<Skeleton class="h-6 w-1/2" />
			<Skeleton class="h-14 w-full" />
		</Card>
	{/each}
</div>
