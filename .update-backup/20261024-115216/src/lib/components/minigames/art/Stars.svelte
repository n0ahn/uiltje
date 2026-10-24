<script lang="ts">
	// One to three stars for a finished game (the numbered star buttons of the design sheet). Filled stars pop in one by one.
	type Props = { filled: 0 | 1 | 2 | 3; size?: number; class?: string };
	let { filled, size = 56, class: className = '' }: Props = $props();
	const STAR = 'M24 3.5l5.6 12.2 13.2 1.5-9.8 9 2.7 13.1L24 32.6 12.3 39.3l2.7-13.1-9.8-9 13.2-1.5Z';
</script>

<div class={['flex items-end justify-center gap-1', className]} role="img" aria-label="{filled} van 3 sterren">
	{#each [0, 1, 2] as i (i)}
		<svg width={i === 1 ? size * 1.2 : size} height={i === 1 ? size * 1.2 : size} viewBox="0 0 48 48" class={['star', i < filled && 'on']} style:--i={i} aria-hidden="true">
			<path d={STAR} class="shape" />
			{#if i < filled}<path d="M17 16.5l4.6-2.8" class="gleam" />{/if}
		</svg>
	{/each}
</div>

<style>
	.shape {
		fill: var(--color-surface-2);
		stroke: var(--color-border);
		stroke-width: 2.5;
		stroke-linejoin: round;
	}
	.on .shape {
		fill: var(--color-wheat);
		stroke: var(--color-ink);
	}
	.on {
		animation: star-pop 520ms var(--ease-spring) both;
		animation-delay: calc(var(--i) * 220ms + 300ms);
	}
	.gleam {
		fill: none;
		stroke: white;
		stroke-width: 2.5;
		stroke-linecap: round;
		opacity: 0.8;
	}
	@keyframes star-pop {
		from {
			transform: scale(0.2) rotate(-40deg);
			opacity: 0;
		}
	}
</style>
