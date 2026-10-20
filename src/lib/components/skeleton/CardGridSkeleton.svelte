<script lang="ts">
	import CardSkeleton from './CardSkeleton.svelte';

	type Props = { variant?: 'set' | 'subject'; count?: number; class?: string };
	let { variant = 'set', count = 6, class: className = '' }: Props = $props();
</script>

<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-busy="true">
	<span class="sr-only">Laden…</span>
	{#each { length: count } as _, i (i)}
		<CardSkeleton {variant} class={className} />
	{/each}
</div>
