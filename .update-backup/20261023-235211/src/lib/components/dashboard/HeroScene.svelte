<script lang="ts">
	// Cozy desk scene for the hero card: shelf, books, plant, lamp, open book, mug.
	// Colors come from tokens; the lamp glow gets stronger in dark theme via --glow-opacity.
	type Props = { class?: string };
	let { class: className = '' }: Props = $props();
</script>

<svg viewBox="0 0 420 220" class={className} preserveAspectRatio="xMaxYMax slice" aria-hidden="true">
	<rect width="420" height="220" class="fill-primary-soft" />
	<!-- lamp glow -->
	<defs>
		<radialGradient id="lamp-glow">
			<stop offset="0" stop-color="var(--color-wheat)" stop-opacity="1" />
			<stop offset="1" stop-color="var(--color-wheat)" stop-opacity="0" />
		</radialGradient>
	</defs>
	<circle cx="250" cy="100" r="110" fill="url(#lamp-glow)" style="opacity: calc(var(--glow-opacity) * 2)" />

	<!-- shelf with books and a small plant -->
	<rect x="290" y="46" width="124" height="7" rx="3" class="fill-clay" />
	<g stroke-width="2" class="stroke-ink" stroke-linejoin="round">
		<rect x="300" y="14" width="12" height="32" rx="2" class="fill-sage" />
		<rect x="314" y="20" width="10" height="26" rx="2" class="fill-sky" />
		<rect x="326" y="12" width="12" height="34" rx="2" class="fill-primary" />
		<path d="M362 46h22l-3 -14h-16z" class="fill-clay" />
	</g>
	<g class="fill-sage">
		<ellipse cx="373" cy="24" rx="6" ry="10" transform="rotate(-25 373 24)" />
		<ellipse cx="381" cy="26" rx="6" ry="10" transform="rotate(25 381 26)" />
		<ellipse cx="377" cy="19" rx="5" ry="9" />
	</g>

	<!-- floor plant (right) -->
	<g>
		<path d="M370 214h38l-5 -34h-28z" class="fill-clay" stroke-width="2" stroke-linejoin="round" />
		<g class="fill-sage">
			<ellipse cx="380" cy="150" rx="9" ry="26" transform="rotate(-22 380 150)" />
			<ellipse cx="398" cy="152" rx="9" ry="26" transform="rotate(22 398 152)" />
			<ellipse cx="389" cy="140" rx="9" ry="28" />
		</g>
	</g>

	<!-- desk -->
	<rect x="150" y="160" width="230" height="10" rx="4" class="fill-clay" />
	<rect x="160" y="170" width="14" height="46" class="fill-clay" />
	<rect x="356" y="170" width="14" height="46" class="fill-clay" />

	<!-- lamp -->
	<g stroke-width="2.5" class="stroke-ink" stroke-linecap="round" stroke-linejoin="round">
		<path d="M200 160v-4h30v4" class="fill-primary-edge" />
		<path d="M215 156L238 98" fill="none" />
		<path d="M238 98L262 120" fill="none" />
		<path d="M222 90l22-18 30 28-22 14z" class="fill-primary" />
	</g>

	<!-- open book and mug -->
	<g stroke-width="2.5" class="stroke-ink" stroke-linejoin="round">
		<path d="M262 160l22-12 24 12z" class="fill-belly" />
		<path d="M284 148v12" fill="none" />
		<rect x="330" y="140" width="18" height="20" rx="4" class="fill-cream" />
		<path d="M348 146h5a4 4 0 0 1 0 9h-5" fill="none" />
	</g>
</svg>