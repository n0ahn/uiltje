<script lang="ts">
	import Card from '../ui/Card.svelte';
	import Skeleton from '../ui/Skeleton.svelte';

	/** `set`: set card (title, meta, button). `subject`: subject card (icon, title, progress). Pass the same `min-h-*` as the real card. */
	type Props = { variant?: 'set' | 'subject'; class?: string };
	let { variant = 'set', class: className = '' }: Props = $props();
</script>

<Card class="flex flex-col gap-3 {className}">
	{#if variant === 'subject'}
		<Skeleton class="size-11" />
		<Skeleton class="mt-1 h-6 w-2/3" />
		<Skeleton class="h-4 w-1/2" />
		<Skeleton class="mt-auto h-2.5 w-full" />
	{:else}
		<Skeleton class="h-6 w-3/4" />
		<Skeleton class="h-4 w-1/3" />
		<Skeleton class="h-4 w-1/2" />
		<Skeleton class="mt-auto h-9 w-28" />
	{/if}
</Card>
