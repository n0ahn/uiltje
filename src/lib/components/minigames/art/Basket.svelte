<script lang="ts">
	// The catching basket (woven wicker with a leaf cushion). It is drawn in two parts so a caught owl can sit INSIDE it:
	// the `back` (the dark inside) goes behind the owls, the `front` (the woven body) in front of them.
	type Props = { part: 'back' | 'front'; class?: string };
	let { part, class: className = '' }: Props = $props();
</script>

{#if part === 'back'}
	<svg class={['bk', className]} viewBox="0 0 160 80" aria-hidden="true">
		<ellipse cx="80" cy="14" rx="68" ry="13" class="inside" />
		<ellipse cx="80" cy="16" rx="52" ry="8" class="cushion" />
	</svg>
{:else}
	<svg class={['bk', className]} viewBox="0 0 160 80" aria-hidden="true">
		<path d="M16 20H144L132 70Q131 76 124 76H36Q29 76 28 70Z" class="body" />
		<path d="M19 36Q80 46 141 36M23 52Q80 62 137 52" class="weave" />
		<path d="M50 22V72M80 24V76M110 22V72" class="weave thin" />
		<rect x="8" y="9" width="144" height="15" rx="7.5" class="rim" />
		<path d="M20 15H66" class="shine" />
	</svg>
{/if}

<style>
	.bk {
		display: block;
		width: 100%;
		height: 100%;
		overflow: visible;
	}
	.inside {
		fill: color-mix(in srgb, var(--color-clay) 45%, black);
		stroke: var(--color-ink);
		stroke-width: 3;
	}
	.cushion {
		fill: color-mix(in srgb, var(--color-sage) 75%, white);
		opacity: 0.85;
	}
	.body {
		fill: var(--color-wheat);
		stroke: var(--color-ink);
		stroke-width: 3;
		stroke-linejoin: round;
	}
	.weave {
		fill: none;
		stroke: var(--color-clay);
		stroke-width: 3;
		stroke-linecap: round;
	}
	.thin {
		stroke-width: 2;
		opacity: 0.55;
	}
	.rim {
		fill: color-mix(in srgb, var(--color-wheat) 70%, var(--color-clay));
		stroke: var(--color-ink);
		stroke-width: 3;
	}
	.shine {
		fill: none;
		stroke: white;
		stroke-width: 3;
		stroke-linecap: round;
		opacity: 0.45;
	}
</style>
