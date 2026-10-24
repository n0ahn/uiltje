<script lang="ts">
	// The back of a memory card: a leaf with veins, in the colors of the game world.
	type Props = { class?: string };
	let { class: className = '' }: Props = $props();
</script>

<svg viewBox="0 0 48 48" class={['leaf', className]} aria-hidden="true">
	<path d="M24 5C11 11 8 25 14 37C17 42 22 43 24 43C26 43 31 42 34 37C40 25 37 11 24 5Z" class="blade" />
	<path d="M24 11V47M24 20L17 14M24 27L15 21M24 34L16 28M24 20L31 14M24 27L33 21M24 34L32 28" class="vein" />
</svg>

<style>
	.leaf {
		width: 44%;
		max-width: 3.4rem;
		height: auto;
	}
	.blade {
		fill: color-mix(in srgb, var(--color-sage) 40%, white);
		stroke: var(--color-sage-edge);
		stroke-width: 2;
		stroke-linejoin: round;
	}
	.vein {
		fill: none;
		stroke: var(--color-sage-edge);
		stroke-width: 1.8;
		stroke-linecap: round;
	}
</style>
