<script lang="ts">
	import Card from '../ui/Card.svelte';
	import Skeleton from '../ui/Skeleton.svelte';
</script>

<!-- Mirrors the review screen of the AI import (set card, list nav, row table). -->
<div class="flex flex-col gap-5" role="status" aria-busy="true">
	<span class="sr-only">Laden…</span>
	<Card class="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
		<Skeleton class="h-12 w-full" />
		<Skeleton class="h-12 w-full" />
	</Card>
	<div class="grid items-start gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
		<Card class="flex flex-col gap-3">
			{#each { length: 3 } as _, i (i)}
				<Skeleton class="h-10 w-full" />
			{/each}
		</Card>
		<Card class="flex flex-col gap-3">
			<Skeleton class="h-6 w-1/3" />
			{#each { length: 8 } as _, i (i)}
				<Skeleton class="h-11 w-full" />
			{/each}
		</Card>
	</div>
</div>
