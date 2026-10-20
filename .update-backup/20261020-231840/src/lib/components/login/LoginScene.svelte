<script lang="ts">
	import Deco from '../ui/Deco.svelte';
	import Butterfly from './Butterfly.svelte';

	// Mint "game world" backdrop for the login screen (DESIGN.md §6.8): bushes in the corners, butterflies, sparkles.
	// Purely decorative, always behind the card.
</script>

<div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
	<!-- left bush -->
	<svg viewBox="0 0 260 150" class="absolute bottom-0 left-0 w-[min(52vw,300px)]" fill="none" stroke-linejoin="round" stroke-linecap="round">
		<g class="stroke-ink" stroke-width="3">
			<circle cx="150" cy="96" r="62" class="fill-sage-edge" />
			<circle cx="62" cy="108" r="56" class="fill-sage" />
			<circle cx="212" cy="124" r="46" class="fill-sage" />
		</g>
		<g class="stroke-glint" stroke-width="5" opacity="0.4">
			<path d="M32 86C38 70 52 62 66 62" />
			<path d="M118 70C124 56 138 48 152 48" />
			<path d="M192 112C196 102 204 98 212 98" />
		</g>
	</svg>

	<!-- right bush -->
	<svg viewBox="0 0 260 150" class="absolute right-0 bottom-0 w-[min(46vw,260px)] -scale-x-100" fill="none" stroke-linejoin="round" stroke-linecap="round">
		<g class="stroke-ink" stroke-width="3">
			<circle cx="140" cy="104" r="58" class="fill-sage" />
			<circle cx="64" cy="124" r="48" class="fill-sage-edge" />
			<circle cx="206" cy="120" r="50" class="fill-sage-edge" />
		</g>
		<g class="stroke-glint" stroke-width="5" opacity="0.4">
			<path d="M104 86C110 72 124 64 138 64" />
			<path d="M176 112C182 100 194 94 206 96" />
		</g>
	</svg>

	<Butterfly tone="pink" size={44} class="absolute top-[14%] left-[8%] drift-a" />
	<Butterfly tone="wheat" size={34} class="absolute top-[58%] right-[7%] drift-b" />
	<Butterfly tone="sky" size={28} class="absolute top-[32%] right-[16%] drift-c hidden sm:block" />

	<Deco kind="sparkle" size={20} class="absolute top-[10%] right-[12%]" />
	<Deco kind="sparkle" size={14} delay={1} class="absolute top-[40%] left-[5%]" />
	<Deco kind="sparkle" size={16} delay={2} class="absolute bottom-[26%] left-[20%] hidden sm:block" />
</div>

<style>
	/* The butterflies float slowly around their spot; reduced motion is handled globally in layout.css. */
	:global(.drift-a) {
		animation: drift 9s ease-in-out infinite;
	}
	:global(.drift-b) {
		animation: drift 11s ease-in-out -3s infinite reverse;
	}
	:global(.drift-c) {
		animation: drift 8s ease-in-out -5s infinite;
	}
	@keyframes drift {
		0%,
		100% {
			transform: translate(0, 0) rotate(-6deg);
		}
		50% {
			transform: translate(14px, -16px) rotate(8deg);
		}
	}
</style>
