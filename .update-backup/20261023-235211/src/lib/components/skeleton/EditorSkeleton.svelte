<script lang="ts">
	import Card from '../ui/Card.svelte';
	import Skeleton from '../ui/Skeleton.svelte';
</script>

<div class="flex flex-col gap-5" role="status" aria-busy="true">
	<span class="sr-only">Set laden…</span>
	<div class="flex flex-wrap items-center gap-3">
		<Skeleton class="h-12 min-w-0 flex-1" />
		<Skeleton class="h-12 w-32" />
	</div>
	<div class="grid items-start gap-5 lg:grid-cols-[16rem_1fr]">
		<Card class="flex flex-col gap-3">
			{#each { length: 4 } as _, i (i)}
				<Skeleton class="h-10 w-full" />
			{/each}
		</Card>
		<Card class="flex flex-col gap-3">
			<Skeleton class="h-6 w-1/3" />
			{#each { length: 6 } as _, i (i)}
				<Skeleton class="h-11 w-full" />
			{/each}
		</Card>
	</div>
</div>
