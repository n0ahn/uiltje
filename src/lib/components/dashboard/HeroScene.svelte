<script lang="ts">
	// Cozy study corner for the hero card: window, shelf with books and a plant, desk with drawers, lamp that lights an
	// open book, pencil cup, mug, and a big plant on the floor. Everything stands on the floor or the desk or hangs on the
	// wall: nothing floats. Colors come from tokens; the lamp glow gets stronger in dark themes via --glow-opacity.
	// The card fades the left side of this picture out, so the scene lives in the right two thirds of the viewBox.
	type Props = { class?: string };
	let { class: className = '' }: Props = $props();
</script>

<svg viewBox="0 0 520 260" class={className} preserveAspectRatio="xMaxYMax slice" aria-hidden="true">
	<defs>
		<radialGradient id="hero-glow">
			<stop offset="0" stop-color="var(--color-wheat)" stop-opacity="1" />
			<stop offset="1" stop-color="var(--color-wheat)" stop-opacity="0" />
		</radialGradient>
		<linearGradient id="hero-beam" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="var(--color-wheat)" stop-opacity="0.9" />
			<stop offset="1" stop-color="var(--color-wheat)" stop-opacity="0" />
		</linearGradient>
	</defs>

	<!-- wall and floor -->
	<rect width="520" height="260" class="fill-primary-soft" />
	<rect y="224" width="520" height="36" class="fill-clay" opacity="0.3" />
	<rect y="221" width="520" height="4" class="fill-clay" opacity="0.45" />
	<circle cx="330" cy="120" r="150" fill="url(#hero-glow)" style="opacity: calc(var(--glow-opacity) * 1.6)" />

	<!-- window with a curtain -->
	<g stroke-width="2.5" class="stroke-ink" stroke-linejoin="round" stroke-linecap="round">
		<rect x="214" y="34" width="78" height="92" rx="6" class="fill-cream" />
		<rect x="221" y="41" width="64" height="78" rx="3" class="fill-sky" opacity="0.4" />
		<path d="M253 41v78M221 80h64" fill="none" />
		<path d="M210 128h86" fill="none" />
	</g>
	<g class="fill-cream" opacity="0.9">
		<path d="M229 64c0-6 6-9 11-7 3-5 12-4 13 3 5 0 7 5 4 8h-26c-3 0-4-2-2-4z" />
	</g>
	<path d="M300 28c8 20 8 62 0 100h-14c6-38 6-80 0-100z" class="fill-rose" opacity="0.75" stroke-width="2.5" stroke-linejoin="round" style="stroke: var(--color-ink)" />

	<!-- shelf with books, a plant and a framed picture above -->
	<g stroke-width="2.5" class="stroke-ink" stroke-linejoin="round" stroke-linecap="round">
		<rect x="386" y="34" width="46" height="36" rx="4" class="fill-cream" />
		<path d="M395 62l11-13 9 9 6-6 8 10z" class="fill-sage" />
		<circle cx="418" cy="44" r="3.5" class="fill-wheat" />
		<rect x="380" y="112" width="126" height="8" rx="3" class="fill-clay" />
		<path d="M392 120v8M494 120v8" fill="none" />
		<rect x="388" y="82" width="13" height="30" rx="2" class="fill-sage" />
		<rect x="402" y="88" width="11" height="24" rx="2" class="fill-sky" />
		<rect x="415" y="80" width="13" height="32" rx="2" class="fill-primary" />
		<path d="M432 112l3-24 12 6-3 18z" class="fill-lilac" />
		<path d="M462 112h30l-4-18h-22z" class="fill-clay" />
	</g>
	<g class="fill-sage" stroke-width="2" style="stroke: var(--color-ink)" stroke-linejoin="round">
		<ellipse cx="469" cy="88" rx="5" ry="11" transform="rotate(-28 469 88)" />
		<ellipse cx="485" cy="88" rx="5" ry="11" transform="rotate(28 485 88)" />
		<ellipse cx="477" cy="82" rx="5" ry="12" />
	</g>

	<!-- floor plant, standing between the window and the desk -->
	<g stroke-width="2.5" class="stroke-ink" stroke-linejoin="round" stroke-linecap="round">
		<path d="M226 222h44l-5-38h-34z" class="fill-clay" />
		<path d="M224 184h48" fill="none" />
		<g class="fill-sage">
			<ellipse cx="236" cy="158" rx="11" ry="25" transform="rotate(-24 236 158)" />
			<ellipse cx="262" cy="160" rx="11" ry="25" transform="rotate(24 262 160)" />
			<ellipse cx="249" cy="150" rx="11" ry="28" />
			<ellipse cx="228" cy="172" rx="8" ry="19" transform="rotate(-62 228 172)" />
			<ellipse cx="270" cy="172" rx="8" ry="19" transform="rotate(62 270 172)" />
		</g>
	</g>

	<!-- desk: top, left leg, drawers on the right -->
	<g stroke-width="2.5" class="stroke-ink" stroke-linejoin="round" stroke-linecap="round">
		<rect x="296" y="172" width="206" height="11" rx="4" class="fill-clay" />
		<rect x="306" y="183" width="10" height="38" class="fill-clay" />
		<rect x="428" y="183" width="66" height="38" rx="2" class="fill-clay" />
		<path d="M428 202h66" fill="none" />
		<g class="fill-cream">
			<rect x="452" y="190" width="18" height="4" rx="2" />
			<rect x="452" y="209" width="18" height="4" rx="2" />
		</g>
	</g>

	<!-- lamp: base, arm, shade and the beam on the book -->
	<path d="M354.500 151.200L378.900 133.800L412 172H348z" fill="url(#hero-beam)" style="opacity: calc(0.3 + var(--glow-opacity))" />
	<g stroke-width="2.5" class="stroke-ink" stroke-linecap="round" stroke-linejoin="round">
		<path d="M312 172v-5h30v5z" class="fill-primary-edge" />
		<path d="M327 167l20 -52" fill="none" stroke-width="3" />
		<path d="M342.100 118.500L351.900 111.500L378.900 133.800L354.500 151.200z" class="fill-primary" />
		<circle cx="347" cy="115" r="3.500" class="fill-cream" />
	</g>

	<!-- open book, pencil cup and mug -->
	<g stroke-width="2.5" class="stroke-ink" stroke-linejoin="round" stroke-linecap="round">
		<path d="M356 172l24 -13 24 13z" class="fill-belly" />
		<path d="M380 159v13" fill="none" />
		<path d="M364 168l12 -6M386 162l12 6" fill="none" stroke-width="1.5" opacity="0.5" />
		<path d="M410 172v-24h22v24z" class="fill-sage" />
		<path d="M416 148l-2 -12M421 148l1 -14M426 148l4 -11" fill="none" stroke-width="2.5" />
		<rect x="438" y="154" width="20" height="18" rx="4" class="fill-cream" />
		<path d="M458 159h5a4.5 4.5 0 0 1 0 9h-5" fill="none" />
		<path d="M443 148c-2 -4 2 -6 0 -10M451 148c-2 -4 2 -6 0 -10" fill="none" stroke-width="2" opacity="0.5" />
	</g>

	<!-- two small sparkles on the wall -->
	<g class="fill-wheat">
		<path d="M340 40c.6 4 2.4 5.8 6.4 6.4-4 .6-5.8 2.4-6.4 6.4-.6-4-2.4-5.8-6.4-6.4 4-.6 5.8-2.4 6.4-6.4z" />
		<path d="M498 52c.4 2.6 1.6 3.8 4.2 4.2-2.6.4-3.8 1.6-4.2 4.2-.4-2.6-1.6-3.8-4.2-4.2 2.6-.4 3.8-1.6 4.2-4.2z" />
	</g>
</svg>
