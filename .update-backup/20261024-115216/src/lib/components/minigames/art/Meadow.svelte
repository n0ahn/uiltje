<script lang="ts">
	// The ground of the minigames: two soft hills, a bush in each corner (rounded blobs with a highlight and a plum outline,
	// DESIGN §3.9 "game world") and a few flowers. Static SVG, colors from the theme tokens.
	type Props = { class?: string };
	let { class: className = '' }: Props = $props();
</script>

<svg class={['meadow', className]} viewBox="0 0 800 130" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
	<defs>
		<g id="uil-bush-left">
			<circle cx="56" cy="78" r="38" /><circle cx="104" cy="92" r="28" /><circle cx="18" cy="96" r="26" />
		</g>
		<g id="uil-bush-right">
			<circle cx="744" cy="78" r="38" /><circle cx="696" cy="92" r="28" /><circle cx="782" cy="96" r="26" />
		</g>
	</defs>
	<path d="M0 46Q200 14 400 44T800 36V130H0Z" class="hill-back" />
	<path d="M0 76Q200 56 400 74T800 68V130H0Z" class="hill-front" />
	<g class="tufts">
		<path d="M170 92q-3-9-7-12M170 92q1-10 4-14M170 92q4-6 10-8" /><path d="M470 100q-3-9-7-12M470 100q1-10 4-14M470 100q4-6 10-8" />
		<path d="M330 88q-3-8-6-11M330 88q1-9 3-12M330 88q4-5 9-7" /><path d="M600 94q-3-8-6-11M600 94q1-9 3-12M600 94q4-5 9-7" />
	</g>
	<g class="flowers">
		<g transform="translate(222 100)"><circle r="6" class="petal-rose" /><circle r="2.4" class="heart" /></g>
		<g transform="translate(396 108)"><circle r="6" class="petal-lilac" /><circle r="2.4" class="heart" /></g>
		<g transform="translate(540 98)"><circle r="6" class="petal-wheat" /><circle r="2.4" class="heart" /></g>
		<g transform="translate(300 112)"><circle r="5" class="petal-wheat" /><circle r="2" class="heart" /></g>
		<g transform="translate(650 108)"><circle r="5" class="petal-rose" /><circle r="2" class="heart" /></g>
	</g>
	<use href="#uil-bush-left" class="outline" /><use href="#uil-bush-left" class="bush" />
	<use href="#uil-bush-right" class="outline" /><use href="#uil-bush-right" class="bush" />
	<g class="shine"><ellipse cx="46" cy="64" rx="13" ry="7" /><ellipse cx="754" cy="64" rx="13" ry="7" /></g>
</svg>

<style>
	.meadow {
		position: absolute;
		inset: auto 0 0 0;
		width: 100%;
		height: 22%;
		pointer-events: none;
	}
	.hill-back {
		fill: color-mix(in srgb, var(--color-sage) 78%, var(--color-sage-edge));
		stroke: var(--color-ink);
		stroke-width: 3;
		stroke-linejoin: round;
	}
	.hill-front {
		fill: var(--color-sage);
		stroke: var(--color-ink);
		stroke-width: 3;
		stroke-linejoin: round;
	}
	.tufts path {
		fill: none;
		stroke: var(--color-sage-edge);
		stroke-width: 3;
		stroke-linecap: round;
	}
	.outline {
		fill: var(--color-ink);
		stroke: var(--color-ink);
		stroke-width: 6;
		stroke-linejoin: round;
	}
	.bush {
		fill: color-mix(in srgb, var(--color-sage) 70%, var(--color-sage-edge));
	}
	.shine {
		fill: color-mix(in srgb, var(--color-sage) 50%, white);
		opacity: 0.7;
	}
	.petal-rose {
		fill: var(--color-rose);
	}
	.petal-lilac {
		fill: var(--color-lilac);
	}
	.petal-wheat {
		fill: var(--color-wheat);
	}
	.heart {
		fill: var(--color-cream);
	}
</style>
