<script lang="ts">
	// A small butterfly for the game world. The wings flap with CSS (stopped by prefers-reduced-motion in layout.css).
	type Props = { tone?: 'rose' | 'lilac' | 'wheat'; size?: number; class?: string };
	let { tone = 'rose', size = 28, class: className = '' }: Props = $props();
</script>

<svg width={size} height={size * 0.8} viewBox="0 0 30 24" class={['butterfly', className]} style:--wing="var(--color-{tone})" aria-hidden="true">
	<g class="wing left"><path d="M15 12C9 2 1 3 2 10C3 15 9 15 15 12ZM15 12C10 14 6 22 11 22C14 22 15 17 15 12Z" /></g>
	<g class="wing right"><path d="M15 12C21 2 29 3 28 10C27 15 21 15 15 12ZM15 12C20 14 24 22 19 22C16 22 15 17 15 12Z" /></g>
	<path d="M15 6V19" class="body" />
	<path d="M15 6Q12 2 10 2M15 6Q18 2 20 2" class="feeler" />
</svg>

<style>
	.wing path {
		fill: var(--wing);
		stroke: var(--color-ink);
		stroke-width: 1.5;
		stroke-linejoin: round;
	}
	.body {
		stroke: var(--color-ink);
		stroke-width: 2.4;
		stroke-linecap: round;
	}
	.feeler {
		fill: none;
		stroke: var(--color-ink);
		stroke-width: 1.2;
		stroke-linecap: round;
	}
	.wing {
		transform-box: fill-box;
		animation: flap 0.5s ease-in-out infinite alternate;
	}
	.left {
		transform-origin: right center;
	}
	.right {
		transform-origin: left center;
		animation-delay: -0.1s;
	}
	@keyframes flap {
		from {
			transform: scaleX(1);
		}
		to {
			transform: scaleX(0.35);
		}
	}
</style>
