<script lang="ts">
	import Card from '../ui/Card.svelte';
	import Skeleton from '../ui/Skeleton.svelte';
</script>

<div class="flex flex-col gap-6" role="status" aria-busy="true">
	<span class="sr-only">Statistieken laden…</span>
	<div class="grid grid-cols-2 gap-4 xl:grid-cols-4">
		{#each { length: 4 } as _, i (i)}
			<Card class="flex flex-col gap-3">
				<Skeleton class="h-4 w-1/2" />
				<Skeleton class="h-8 w-2/3" />
				<Skeleton class="h-3 w-full" />
			</Card>
		{/each}
	</div>
	<Card class="flex flex-col gap-4">
		<Skeleton class="h-6 w-40" />
		<Skeleton class="h-48 w-full" />
	</Card>
	<div class="grid gap-6 lg:grid-cols-2 lg:items-start">
		{#each { length: 2 } as _, i (i)}
			<Card class="flex flex-col gap-4">
				<Skeleton class="h-6 w-48" />
				{#each { length: 4 } as _, j (j)}
					<Skeleton class="h-10 w-full" />
				{/each}
			</Card>
		{/each}
	</div>
</div>
