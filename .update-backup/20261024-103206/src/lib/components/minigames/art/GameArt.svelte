<script lang="ts" module>
	export type GameArtKind = 'catch' | 'memory' | 'flight' | 'nest';
</script>

<script lang="ts">
	// Small illustrations for the game cards on the minigames page. They reuse the mascot and the scene pieces,
	// so every game looks like it belongs to the same world.
	import Owl from '../../ui/Owl.svelte';
	import Basket from './Basket.svelte';
	import Canopy from './Canopy.svelte';
	import Meadow from './Meadow.svelte';
	import Nest from './Nest.svelte';

	type Props = { kind: GameArtKind; class?: string };
	let { kind, class: className = '' }: Props = $props();
</script>

<div class={['art relative isolate aspect-16/10 w-full overflow-hidden', kind === 'flight' ? 'night' : 'day', className]} aria-hidden="true">
	{#if kind === 'catch'}
		<Canopy />
		<Meadow />
		<span class="abs" style="left:14%; top:26%; rotate:-12deg"><Owl pose="cheer" size={40} /></span>
		<span class="abs" style="left:68%; top:20%; rotate:10deg"><Owl pose="cheer" size={40} /></span>
		<span class="abs" style="left:41%; top:44%; width:19%; height:19%"><Basket part="back" /></span>
		<span class="abs" style="left:43%; top:30%; rotate:4deg"><Owl pose="happy" size={44} /></span>
		<span class="abs" style="left:41%; top:44%; width:19%; height:19%"><Basket part="front" /></span>
	{:else if kind === 'memory'}
		<svg class="fill" viewBox="0 0 240 150">
			<g class="card back-card"><rect x="38" y="20" width="62" height="52" rx="12" /><path d="M69 32V60M69 40l-9-6M69 48l9-6M69 54l-9-6" class="vein" /></g>
			<g class="card face-card"><rect x="110" y="20" width="62" height="52" rx="12" /></g>
			<g class="card face-card"><rect x="38" y="82" width="62" height="52" rx="12" /></g>
			<g class="card back-card"><rect x="110" y="82" width="62" height="52" rx="12" /><path d="M141 94V122M141 102l-9-6M141 110l9-6M141 116l-9-6" class="vein" /></g>
			<path d="M196 30l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" class="sparkle" />
		</svg>
		<span class="abs" style="left:49.5%; top:16%"><Owl pose="happy" size={34} /></span>
		<span class="abs" style="left:19%; top:56%"><Owl pose="happy" size={34} /></span>
	{:else if kind === 'flight'}
		<svg class="fill" viewBox="0 0 240 150">
			<circle cx="148" cy="38" r="15" class="moon" /><circle cx="154" cy="33" r="13" class="moon-cut" />
			<path d="M30 20l2 5 5 2-5 2-2 5-2-5-5-2 5-2ZM150 14l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5Z" class="twinkle" />
			<g class="pipe"><rect x="86" y="-4" width="34" height="62" rx="8" /><rect x="86" y="96" width="34" height="62" rx="8" /></g>
			<g class="pipe"><rect x="176" y="-4" width="34" height="38" rx="8" /><rect x="176" y="72" width="34" height="86" rx="8" /></g>
		</svg>
		<span class="abs" style="left:24%; top:34%; rotate:-8deg"><Owl pose="happy" size={44} /></span>
	{:else}
		<Meadow />
		<span class="abs" style="left:10%; top:30%; width:24%; height:24%"><Basket part="back" /></span>
		<span class="abs" style="left:10%; top:30%; width:24%; height:24%"><Basket part="front" /></span>
		<span class="abs" style="left:38%; top:30%; width:24%; height:24%"><Basket part="back" /></span>
		<span class="abs" style="left:38%; top:30%; width:24%; height:24%"><Basket part="front" /></span>
		<span class="abs" style="left:66%; top:30%; width:24%; height:24%"><Basket part="back" /></span>
		<span class="abs" style="left:66%; top:30%; width:24%; height:24%"><Basket part="front" /></span>
		<span class="abs twig-tag" style="left:42%; top:6%; rotate:-8deg"></span>
		<span class="abs twig-tag" style="left:14%; top:12%; rotate:6deg"></span>
		<span class="abs" style="left:70%; top:8%"><Nest owls={2} size={40} /></span>
	{/if}
</div>

<style>
	.art {
		border-radius: var(--radius-tile);
	}
	.day {
		background: linear-gradient(to bottom, color-mix(in srgb, var(--color-mint) 80%, var(--color-sky)), var(--color-mint));
	}
	.night {
		background: linear-gradient(to bottom, color-mix(in srgb, var(--color-lilac) 45%, black), color-mix(in srgb, var(--color-lilac) 70%, black));
	}
	.abs {
		position: absolute;
		display: block;
	}
	.fill {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	.card rect {
		stroke: var(--color-ink);
		stroke-width: 3;
	}
	.back-card rect {
		fill: var(--color-sage);
	}
	.face-card rect {
		fill: var(--color-cream);
	}
	.vein {
		fill: none;
		stroke: var(--color-ink);
		stroke-width: 3;
		stroke-linecap: round;
		opacity: 0.55;
	}
	.sparkle {
		fill: var(--color-wheat);
	}
	.moon {
		fill: var(--color-wheat);
	}
	.moon-cut {
		fill: color-mix(in srgb, var(--color-lilac) 55%, black);
	}
	.twinkle {
		fill: var(--color-cream);
	}
	.pipe rect {
		fill: var(--color-clay);
		stroke: var(--color-ink);
		stroke-width: 3;
	}
	.twig-tag {
		width: 22%;
		height: 12%;
		border: 3px solid var(--color-ink);
		border-radius: 8px;
		background: var(--color-cream);
	}
</style>
