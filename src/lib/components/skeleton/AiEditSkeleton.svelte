<script lang="ts">
	import Skeleton from '../ui/Skeleton.svelte';
</script>

<!-- Mirrors the review of "Aanpassen met AI": a summary line and a few change rows. -->
<div class="flex flex-col gap-3" role="status" aria-busy="true">
	<span class="sr-only">Laden…</span>
	<Skeleton class="h-5 w-2/3" />
	{#each { length: 4 } as _, i (i)}
		<Skeleton class="h-16 w-full" />
	{/each}
</div>
