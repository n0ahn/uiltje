<script lang="ts">
	import Card from '../ui/Card.svelte';
	import Skeleton from '../ui/Skeleton.svelte';
</script>

<div class="flex flex-col gap-5" role="status" aria-busy="true">
	<span class="sr-only">Set laden…</span>
	<Skeleton class="h-5 w-24" />
	<div class="flex flex-col gap-2">
		<Skeleton class="h-9 w-1/2 max-w-md" />
		<Skeleton class="h-5 w-1/3 max-w-xs" />
	</div>
	<div class="flex flex-wrap items-center gap-3">
		<Skeleton class="h-12 w-40" />
		<Skeleton class="h-12 w-36" />
		<Skeleton class="size-12" />
	</div>
	<Card class="flex flex-col gap-3">
		<Skeleton class="h-6 w-32" />
		<Skeleton class="h-3 w-full" />
	</Card>
	<div class="grid items-start gap-5 xl:grid-cols-2">
		{#each { length: 2 } as _, i (i)}
			<Card class="flex flex-col gap-3">
				<Skeleton class="h-6 w-1/2" />
				{#each { length: 5 } as _, j (j)}
					<Skeleton class="h-10 w-full" />
				{/each}
			</Card>
		{/each}
	</div>
</div>
