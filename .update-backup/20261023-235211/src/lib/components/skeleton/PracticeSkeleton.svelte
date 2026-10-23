<script lang="ts">
	import Card from '../ui/Card.svelte';
	import Skeleton from '../ui/Skeleton.svelte';

	/** `start`: setup screen (full width, two columns). `focus`: running session (one fixed `max-w-3xl` column). */
	type Props = { variant?: 'start' | 'focus' };
	let { variant = 'start' }: Props = $props();
</script>

<div role="status" aria-busy="true" class={variant === 'focus' ? 'mx-auto flex max-w-3xl flex-col gap-5' : 'flex flex-col gap-5'}>
	<span class="sr-only">Laden…</span>
	<Skeleton class="h-5 w-24" />
	<Skeleton class="h-9 w-1/2 max-w-md" />
	{#if variant === 'focus'}
		<Skeleton class="h-3 w-full" />
		<Card class="flex flex-col gap-4">
			{#each { length: 4 } as _, i (i)}
				<Skeleton class="h-12 w-full" />
			{/each}
			<Skeleton class="h-12 w-44" />
		</Card>
	{:else}
		<div class="grid items-start gap-5 lg:grid-cols-[1fr_22rem]">
			<Card class="flex flex-col gap-3">
				<Skeleton class="h-6 w-1/3" />
				{#each { length: 5 } as _, i (i)}
					<Skeleton class="h-12 w-full" />
				{/each}
			</Card>
			<Card class="flex flex-col gap-4">
				<Skeleton class="h-6 w-1/3" />
				<Skeleton class="h-11 w-full" />
				<Skeleton class="h-11 w-full" />
				<Skeleton class="h-12 w-full" />
			</Card>
		</div>
	{/if}
</div>
