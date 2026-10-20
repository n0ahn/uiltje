<script lang="ts">
	import Card from '../ui/Card.svelte';
	import Skeleton from '../ui/Skeleton.svelte';
</script>

<div class="flex flex-col gap-5" role="status" aria-busy="true">
	<span class="sr-only">Ranglijst laden…</span>
	<div class="grid grid-cols-3 items-end gap-3 sm:gap-5">
		<Skeleton class="h-28 w-full" />
		<Skeleton class="h-36 w-full" />
		<Skeleton class="h-24 w-full" />
	</div>
	<Card class="flex flex-col gap-3">
		{#each { length: 4 } as _, i (i)}
			<div class="flex items-center gap-3">
				<Skeleton class="size-7 shrink-0 rounded-full!" />
				<Skeleton class="size-10 shrink-0 rounded-full!" />
				<Skeleton class="h-5 min-w-0 flex-1" />
				<Skeleton class="h-5 w-20" />
			</div>
		{/each}
	</Card>
</div>
