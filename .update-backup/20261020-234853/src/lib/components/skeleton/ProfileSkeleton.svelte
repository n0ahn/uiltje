<script lang="ts">
	import Card from '../ui/Card.svelte';
	import Skeleton from '../ui/Skeleton.svelte';
</script>

<div class="grid gap-5 lg:grid-cols-2 lg:items-start" role="status" aria-busy="true">
	<span class="sr-only">Profiel laden…</span>
	<Card class="flex items-center gap-5 lg:col-span-2">
		<Skeleton class="size-28 shrink-0 rounded-full!" />
		<div class="flex flex-1 flex-col gap-3">
			<Skeleton class="h-6 w-1/3" />
			<Skeleton class="h-11 w-48" />
		</div>
	</Card>
	{#each { length: 2 } as _, i (i)}
		<Card class="flex flex-col gap-4">
			<Skeleton class="h-6 w-1/3" />
			<Skeleton class="h-12 w-full" />
			<Skeleton class="h-12 w-full" />
			<Skeleton class="h-11 w-32" />
		</Card>
	{/each}
</div>
