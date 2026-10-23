<script lang="ts" module>
	export type OwlPose = 'idle' | 'happy' | 'thinking' | 'cheer' | 'sleepy' | 'oops';
</script>

<script lang="ts">
	// Uiltje, the mascot (DESIGN.md §4). Flat SVG, outline like the chunky buttons.
	/** `bob`: floats up and down slowly (for the big owl on empty screens). */
	type Props = { pose?: OwlPose; size?: number; class?: string; label?: string; bob?: boolean };
	let { pose = 'idle', size = 64, class: className = '', label, bob = false }: Props = $props();

	const closedEyes = $derived(pose === 'happy' || pose === 'cheer' || pose === 'sleepy');
	// Pupil offset: thinking looks up-left.
	const look = $derived(pose === 'thinking' ? { x: -3, y: -3 } : { x: 0, y: 0 });
	const pupilRadius = $derived(pose === 'oops' ? 6 : 5);
</script>

<svg
	width={size}
	height={size * 1.1}
	viewBox="0 0 100 110"
	class={['shrink-0', bob && 'animate-[bob_4s_ease-in-out_infinite]', className]}
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
>
	<g class="line" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
		<!-- feet -->
		<ellipse cx="38" cy="102" rx="8" ry="4" class="beak" />
		<ellipse cx="62" cy="102" rx="8" ry="4" class="beak" />

		<!-- tufts -->
		<path d="M27 25 L21 6 L43 17Z" class="wing" />
		<path d="M73 25 L79 6 L57 17Z" class="wing" />

		<!-- body -->
		<path d="M50 12C28 12 16 30 16 58C16 88 30 100 50 100C70 100 84 88 84 58C84 30 72 12 50 12Z" class="body" />

		<!-- belly with feather scallops -->
		<ellipse cx="50" cy="75" rx="21" ry="22" class="belly" stroke="none" />
		<path d="M39 71q4 4 8 0M53 71q4 4 8 0M46 82q4 4 8 0" fill="none" class="scallop" stroke-width="2" />

		<!-- wings -->
		{#if pose === 'cheer'}
			<path d="M18 58C4 50 5 32 15 28C23 36 23 48 18 58Z" class="wing" />
			<path d="M82 58C96 50 95 32 85 28C77 36 77 48 82 58Z" class="wing" />
		{:else if pose === 'thinking'}
			<path d="M18 56C6 64 8 84 24 90C28 78 26 64 18 56Z" class="wing" />
			<path d="M80 64C92 58 84 46 66 55C70 64 74 68 80 64Z" class="wing" />
		{:else}
			<path d="M18 56C6 64 8 84 24 90C28 78 26 64 18 56Z" class="wing" />
			<path d="M82 56C94 64 92 84 76 90C72 78 74 64 82 56Z" class="wing" />
		{/if}

		<!-- eyes -->
		{#if closedEyes}
			{#if pose === 'sleepy'}
				<path d="M27 45Q37 53 47 45M53 45Q63 53 73 45" fill="none" class="line" stroke-width="3" />
			{:else}
				<path d="M27 47Q37 35 47 47M53 47Q63 35 73 47" fill="none" class="line" stroke-width="3" />
			{/if}
		{:else}
			<g class="eyes">
				<circle cx="37" cy="44" r="11" class="belly" />
				<circle cx="63" cy="44" r="11" class="belly" />
				<circle cx={37 + look.x} cy={44 + look.y} r={pupilRadius} class="pupil" stroke="none" />
				<circle cx={63 + look.x} cy={44 + look.y} r={pupilRadius} class="pupil" stroke="none" />
				<circle cx={39 + look.x} cy={42 + look.y} r="1.8" class="glint" stroke="none" />
				<circle cx={65 + look.x} cy={42 + look.y} r="1.8" class="glint" stroke="none" />
			</g>
		{/if}

		<!-- beak -->
		<path d="M45 54L55 54L50 63Z" class="beak" stroke-width="2.5" />
		{#if pose === 'cheer'}
			<path d="M45.5 63Q50 71 54.5 63Z" class="pupil" stroke="none" />
		{/if}
	</g>

	{#if pose === 'happy' || pose === 'cheer'}
		<circle cx="27" cy="57" r="4" class="blush" />
		<circle cx="73" cy="57" r="4" class="blush" />
	{/if}
	{#if pose === 'sleepy'}
		<path d="M78 14h8l-8 9h8M88 4h5l-5 6h5" fill="none" class="zzz" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
	{/if}
	{#if pose === 'oops'}
		<path d="M82 22C86 28 88 31 82 34C76 31 78 28 82 22Z" class="drop" />
	{/if}
</svg>

<style>
	.line {
		stroke: var(--color-ink);
	}
	.body {
		fill: var(--color-owl);
	}
	.wing {
		fill: var(--color-owl-dark);
	}
	.belly {
		fill: var(--color-belly);
	}
	.beak {
		fill: var(--color-beak);
	}
	.pupil {
		fill: var(--color-pupil);
	}
	.glint {
		fill: var(--color-glint);
	}
	.scallop {
		stroke: var(--color-owl-dark);
		opacity: 0.35;
	}
	.blush {
		fill: var(--color-rose);
		opacity: 0.7;
	}
	.zzz {
		stroke: var(--color-wheat);
	}
	.drop {
		fill: var(--color-sky);
	}
	/* Blink every ~5s (idle only; disabled by prefers-reduced-motion in layout.css) */
	.eyes {
		transform-box: fill-box;
		transform-origin: center;
		animation: blink 5s infinite;
	}
</style>