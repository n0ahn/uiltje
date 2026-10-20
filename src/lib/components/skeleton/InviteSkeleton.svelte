<script lang="ts">
	import Card from '../ui/Card.svelte';
	import Skeleton from '../ui/Skeleton.svelte';
</script>

<Card class="mx-auto flex max-w-md flex-col items-center gap-4" aria-hidden="true">
	<span class="sr-only" role="status">Laden…</span>
	<Skeleton class="size-24 rounded-full!" />
	<Skeleton class="h-7 w-1/2" />
	<Skeleton class="h-4 w-1/3" />
	<Skeleton class="h-12 w-48" />
</Card>
