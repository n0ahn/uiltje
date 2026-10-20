<script lang="ts">
	type Props = { tone?: 'pink' | 'wheat' | 'sky'; size?: number; class?: string };
	let { tone = 'pink', size = 40, class: className = '' }: Props = $props();

	// Complete class names so Tailwind can see them.
	const FILL = { pink: 'fill-pink', wheat: 'fill-wheat', sky: 'fill-sky' } as const;
</script>

<svg width={size} height={size * 0.83} viewBox="0 0 48 40" fill="none" class={['shrink-0', className]} aria-hidden="true">
	<g class="stroke-ink" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">
		<g class="wings">
			<path d="M24 20C18 6 6 4 5 12C4 20 14 24 24 20Z" class={FILL[tone]} />
			<path d="M24 20C16 24 8 34 14 36C20 38 24 28 24 20Z" class={FILL[tone]} />
			<path d="M24 20C30 6 42 4 43 12C44 20 34 24 24 20Z" class={FILL[tone]} />
			<path d="M24 20C32 24 40 34 34 36C28 38 24 28 24 20Z" class={FILL[tone]} />
		</g>
		<path d="M24 13V29M24 13L21 7M24 13L27 7" />
	</g>
</svg>

<style>
	.wings {
		transform-box: fill-box;
		transform-origin: center;
		animation: flap 0.9s ease-in-out infinite;
	}
	@keyframes flap {
		0%,
		100% {
			transform: scaleX(1);
		}
		50% {
			transform: scaleX(0.55);
		}
	}
</style>
