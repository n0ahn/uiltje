<script lang="ts">
	// The nest in the corner of the game: every caught owl peeks out of it (up to four heads, then it just says the number).
	type Props = { owls: number; size?: number; class?: string };
	let { owls, size = 72, class: className = '' }: Props = $props();
	// x of each head; the heads sit a little lower at the sides.
	const HEADS = [
		{ x: 30, y: 44 },
		{ x: 90, y: 44 },
		{ x: 50, y: 36 },
		{ x: 70, y: 36 }
	] as const;
</script>

<svg width={size} height={size * 0.75} viewBox="0 0 120 90" class={['nest', className]} aria-hidden="true">
	<ellipse cx="60" cy="58" rx="50" ry="14" class="inside" />
	{#each HEADS as head, i (i)}
		{#if owls > i}
			<g transform="translate({head.x} {head.y})">
				<g class="head">
					<path d="M-14 -10L-17 -24L-4 -16ZM14 -10L17 -24L4 -16Z" class="tuft" />
					<circle r="16" class="face" />
					<circle cx="-6" cy="-2" r="5.5" class="eye" /><circle cx="6" cy="-2" r="5.5" class="eye" />
					<circle cx="-6" cy="-2" r="2.4" class="pupil" /><circle cx="6" cy="-2" r="2.4" class="pupil" />
					<path d="M-2.5 4H2.5L0 8Z" class="beak" />
				</g>
			</g>
		{/if}
	{/each}
	<path d="M8 56Q10 84 60 84T112 56Q60 70 8 56Z" class="bowl" />
	<path d="M16 66Q60 78 104 66M24 74Q60 82 96 74" class="twig" />
	<path d="M6 54Q30 62 56 60M64 60Q92 62 114 54" class="twig rim" />
</svg>

<style>
	.inside {
		fill: color-mix(in srgb, var(--color-clay) 45%, black);
		stroke: var(--color-ink);
		stroke-width: 3;
	}
	.face {
		fill: var(--color-owl);
		stroke: var(--color-ink);
		stroke-width: 3;
	}
	.tuft {
		fill: var(--color-owl-dark);
		stroke: var(--color-ink);
		stroke-width: 2.5;
		stroke-linejoin: round;
	}
	.eye {
		fill: var(--color-belly);
	}
	.pupil {
		fill: var(--color-pupil);
	}
	.beak {
		fill: var(--color-beak);
	}
	.head {
		animation: peek 420ms var(--ease-spring) both;
	}
	.bowl {
		fill: var(--color-wheat);
		stroke: var(--color-ink);
		stroke-width: 3;
		stroke-linejoin: round;
	}
	.twig {
		fill: none;
		stroke: var(--color-clay);
		stroke-width: 3.5;
		stroke-linecap: round;
	}
	.rim {
		stroke: var(--color-ink);
		stroke-width: 3;
	}
	@keyframes peek {
		from {
			transform: translateY(14px);
			opacity: 0;
		}
	}
</style>
