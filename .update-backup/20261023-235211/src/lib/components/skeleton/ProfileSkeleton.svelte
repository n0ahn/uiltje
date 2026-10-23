<script lang="ts">
	import Card from '../ui/Card.svelte';
	import Skeleton from '../ui/Skeleton.svelte';
</script>

<!-- Mirrors a profile: header card, six stat cards, set cards. -->
<div class="flex flex-col gap-5" role="status" aria-busy="true">
	<span class="sr-only">Profiel laden…</span>
	<Card class="flex items-center gap-5">
		<Skeleton class="size-28 shrink-0 rounded-full!" />
		<div class="flex flex-1 flex-col gap-3">
			<Skeleton class="h-8 w-1/3" />
			<Skeleton class="h-5 w-1/4" />
			<Skeleton class="h-7 w-40" />
		</div>
	</Card>
	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
		{#each { length: 6 } as _, i (i)}
			<Card class="flex flex-col gap-2">
				<Skeleton class="h-5 w-1/2" />
				<Skeleton class="h-9 w-1/3" />
				<Skeleton class="h-5 w-2/3" />
			</Card>
		{/each}
	</div>
	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
		{#each { length: 3 } as _, i (i)}
			<Card class="flex flex-col gap-2">
				<Skeleton class="h-6 w-2/3" />
				<Skeleton class="h-4 w-1/3" />
				<Skeleton class="h-4 w-1/2" />
			</Card>
		{/each}
	</div>
</div>
