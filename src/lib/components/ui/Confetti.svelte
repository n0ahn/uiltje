<script lang="ts">
	import { onMount } from 'svelte';

	// Light confetti for passing a test or finishing a session. Hidden for people who prefer reduced motion
	// (CSS below), removes itself after the animation.
	type Props = { pieces?: number };
	let { pieces = 36 }: Props = $props();

	const COLORS = ['primary', 'sage', 'wheat', 'rose', 'sky', 'lilac'];

	// Deterministic spread, so the pieces do not depend on Math.random during render.
	function spread(i: number, salt: number): number {
		const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
		return x - Math.floor(x);
	}

	// svelte-ignore state_referenced_locally
	const items = Array.from({ length: pieces }, (_, i) => ({
		left: spread(i, 1) * 100,
		x: (spread(i, 2) - 0.5) * 240,
		rotate: (spread(i, 3) - 0.5) * 900,
		delay: spread(i, 4) * 0.5,
		duration: 2.4 + spread(i, 5) * 1.6,
		width: 6 + spread(i, 6) * 6,
		height: 8 + spread(i, 7) * 8,
		color: COLORS[i % COLORS.length]
	}));

	let visible = $state(true);
	onMount(() => {
		const timer = setTimeout(() => (visible = false), 4800);
		return () => clearTimeout(timer);
	});
</script>

{#if visible}
	<div class="confetti" aria-hidden="true">
		{#each items as item, i (i)}
			<span
				class="piece"
				style="left:{item.left}%; --x:{item.x}px; --r:{item.rotate}deg; --delay:{item.delay}s; --d:{item.duration}s; --w:{item.width}px; --h:{item.height}px; --c:var(--color-{item.color})"
			></span>
		{/each}
	</div>
{/if}

<style>
	.confetti {
		position: fixed;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		z-index: 60;
	}
	.piece {
		position: absolute;
		top: -16px;
		width: var(--w);
		height: var(--h);
		border-radius: 2px;
		background: var(--c);
		opacity: 0;
		animation: confetti-fall var(--d) var(--delay) cubic-bezier(0.25, 0.6, 0.4, 1) forwards;
	}
	@keyframes confetti-fall {
		0% {
			opacity: 1;
			transform: translate3d(0, 0, 0) rotate(0deg);
		}
		85% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translate3d(var(--x), 105vh, 0) rotate(var(--r));
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.confetti {
			display: none;
		}
	}
</style>
