<script lang="ts">
	import Card from '../ui/Card.svelte';
	import Skeleton from '../ui/Skeleton.svelte';
</script>

<Card class="mx-auto flex max-w-xl flex-col gap-4" aria-hidden="true">
	<span class="sr-only" role="status">Laden…</span>
	<div class="flex items-center gap-3">
		<Skeleton class="size-10 shrink-0 rounded-full!" />
		<Skeleton class="h-4 w-1/2" />
	</div>
	<Skeleton class="h-8 w-3/4" />
	<Skeleton class="h-4 w-1/2" />
	<Skeleton class="h-24 w-full" />
	<Skeleton class="h-12 w-48" />
</Card>
