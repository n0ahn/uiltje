<script lang="ts">
	// The tree for the minigames: a leafy canopy across the top and a trunk at the right edge. Flat SVG with the same plum
	// outline as the mascot and the chunky buttons. Colors come from the theme tokens, so it follows light and dark.
	// The shapes are drawn once in <defs> and used twice: first fat in plum (the outline), then in leaf green on top.
	type Props = { class?: string };
	let { class: className = '' }: Props = $props();
</script>

<!-- trunk -->
<svg class={['trunk', className]} viewBox="0 0 80 400" preserveAspectRatio="none" aria-hidden="true">
	<path d="M24 0V400H80V0Z" class="trunk-body" />
	<path d="M44 40V150M58 90V300M34 230V360" class="bark" />
	<ellipse cx="56" cy="210" rx="9" ry="13" class="knot" />
</svg>

<!-- canopy -->
<svg class={['canopy', className]} viewBox="0 0 800 230" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
	<defs>
		<g id="uil-leaves-back">
			<rect x="0" y="0" width="800" height="120" />
			<circle cx="0" cy="120" r="78" /><circle cx="110" cy="124" r="74" /><circle cx="225" cy="120" r="80" />
			<circle cx="340" cy="126" r="72" /><circle cx="455" cy="120" r="78" /><circle cx="570" cy="124" r="74" />
			<circle cx="685" cy="120" r="80" /><circle cx="800" cy="124" r="76" />
		</g>
		<g id="uil-leaves-mid">
			<rect x="0" y="0" width="800" height="96" />
			<circle cx="55" cy="98" r="62" /><circle cx="168" cy="102" r="58" /><circle cx="282" cy="98" r="64" />
			<circle cx="398" cy="104" r="56" /><circle cx="512" cy="98" r="62" /><circle cx="626" cy="102" r="58" />
			<circle cx="742" cy="98" r="64" />
		</g>
	</defs>
	<use href="#uil-leaves-back" class="outline" />
	<use href="#uil-leaves-back" class="back" />
	<use href="#uil-leaves-mid" class="outline" />
	<use href="#uil-leaves-mid" class="mid" />
	<g class="light">
		<ellipse cx="92" cy="46" rx="26" ry="14" /><ellipse cx="228" cy="34" rx="22" ry="12" /><ellipse cx="352" cy="52" rx="28" ry="14" />
		<ellipse cx="486" cy="36" rx="24" ry="12" /><ellipse cx="612" cy="54" rx="26" ry="13" /><ellipse cx="736" cy="38" rx="22" ry="12" />
	</g>
	<g class="blossom">
		<circle cx="150" cy="82" r="6" /><circle cx="318" cy="94" r="5" /><circle cx="540" cy="84" r="6" /><circle cx="674" cy="96" r="5" />
	</g>
</svg>

<style>
	.canopy,
	.trunk {
		position: absolute;
		pointer-events: none;
	}
	.canopy {
		inset: 0 0 auto 0;
		width: 100%;
		height: 38%;
	}
	.trunk {
		top: 0;
		right: 0;
		width: 11%;
		height: 100%;
	}
	.outline {
		fill: var(--color-ink);
		stroke: var(--color-ink);
		stroke-width: 6;
		stroke-linejoin: round;
	}
	.back {
		fill: color-mix(in srgb, var(--color-sage-edge) 80%, black);
	}
	.mid {
		fill: var(--color-sage);
	}
	.light {
		fill: color-mix(in srgb, var(--color-sage) 55%, white);
		opacity: 0.6;
	}
	.blossom {
		fill: var(--color-rose);
	}
	.trunk-body {
		fill: var(--color-clay);
		stroke: var(--color-ink);
		stroke-width: 3;
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}
	.bark {
		fill: none;
		stroke: color-mix(in srgb, var(--color-clay) 60%, black);
		stroke-width: 3;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
		opacity: 0.6;
	}
	.knot {
		fill: color-mix(in srgb, var(--color-clay) 55%, black);
		opacity: 0.7;
	}
</style>
