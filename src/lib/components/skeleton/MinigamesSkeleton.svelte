<script lang="ts">
	import Card from '../ui/Card.svelte';
	import Skeleton from '../ui/Skeleton.svelte';

	// Mirrors the minigames page: title block and a grid of game cards (art, title, text, button).
</script>

<div class="flex flex-col gap-5" role="status" aria-busy="true">
	<span class="sr-only">Laden…</span>
	<Skeleton class="h-5 w-28" />
	<div class="flex flex-col gap-2"><Skeleton class="h-9 w-56" /><Skeleton class="h-5 w-72 max-w-full" /></div>
	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
		{#each { length: 4 } as _, i (i)}
			<Card aria-hidden="true" class="flex min-h-80 flex-col gap-3">
				<Skeleton class="aspect-16/10 w-full" />
				<Skeleton class="h-6 w-40" />
				<Skeleton class="h-4 w-full" />
				<Skeleton class="h-4 w-2/3" />
				<Skeleton class="mt-auto h-11 w-32" />
			</Card>
		{/each}
	</div>
</div>
