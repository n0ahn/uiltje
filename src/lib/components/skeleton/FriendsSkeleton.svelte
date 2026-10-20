<script lang="ts">
	import ListSkeleton from './ListSkeleton.svelte';
</script>

<div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start" role="status" aria-busy="true">
	<span class="sr-only">Vrienden laden…</span>
	<div class="flex flex-col gap-5">
		<ListSkeleton rows={1} />
		<ListSkeleton rows={4} />
	</div>
	<div class="flex flex-col gap-5">
		<ListSkeleton rows={1} />
		<ListSkeleton rows={2} />
	</div>
</div>
