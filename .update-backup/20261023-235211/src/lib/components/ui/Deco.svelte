<script lang="ts">
	// Decorations (DESIGN.md §3.9): use sparingly, never behind text that must be read.
	type Props = {
		kind: 'sparkle' | 'sprig';
		size?: number;
		/** Delay for the twinkle animation, so sparkles do not pulse in sync. */
		delay?: number;
		class?: string;
	};
	let { kind, size = 16, delay = 0, class: className = '' }: Props = $props();
</script>

{#if kind === 'sparkle'}
	<svg
		width={size}
		height={size}
		viewBox="0 0 24 24"
		aria-hidden="true"
		class={['sparkle pointer-events-none text-wheat', className]}
		style:animation-delay="{delay}s"
	>
		<path d="M12 1.5c.9 5.4 3.6 8.1 9 9-5.4.9-8.1 3.6-9 9-.9-5.4-3.6-8.1-9-9 5.4-.9 8.1-3.6 9-9z" fill="currentColor" />
	</svg>
{:else}
	<svg
		width={size}
		height={size * 1.5}
		viewBox="0 0 40 60"
		aria-hidden="true"
		fill="none"
		stroke-linecap="round"
		class={['pointer-events-none text-sage opacity-50', className]}
	>
		<path d="M20 58C20 40 22 22 30 4" stroke="currentColor" stroke-width="2" />
		<g fill="currentColor">
			<ellipse cx="14" cy="42" rx="6" ry="3" transform="rotate(-35 14 42)" />
			<ellipse cx="27" cy="34" rx="6" ry="3" transform="rotate(35 27 34)" />
			<ellipse cx="15" cy="28" rx="6" ry="3" transform="rotate(-35 15 28)" />
			<ellipse cx="29" cy="20" rx="5.5" ry="2.8" transform="rotate(35 29 20)" />
			<ellipse cx="22" cy="11" rx="5" ry="2.6" transform="rotate(-30 22 11)" />
		</g>
	</svg>
{/if}

<style>
	.sparkle {
		animation: twinkle 3s ease-in-out infinite;
	}
</style>