<script lang="ts">
	import type { Snippet } from 'svelte';
	import { accentStyle } from './accent';
	import type { Accent } from './accent';

	type Props = {
		/** 0..1 */
		value: number;
		accent?: Accent;
		size?: number;
		stroke?: number;
		label: string;
		/** Centered content, e.g. `3/6`. */
		children?: Snippet;
		class?: string;
	};

	let { value, accent = 'sage', size = 96, stroke = 8, label, children, class: className = '' }: Props = $props();

	const clamped = $derived(Math.min(1, Math.max(0, value)));
	const radius = $derived((size - stroke) / 2);
	const circumference = $derived(2 * Math.PI * radius);
</script>

<div
	role="progressbar"
	aria-label={label}
	aria-valuemin="0"
	aria-valuemax="100"
	aria-valuenow={Math.round(clamped * 100)}
	style="{accentStyle(accent)}; width:{size}px; height:{size}px"
	class={['relative inline-grid place-items-center', className]}
>
	<svg width={size} height={size} viewBox="0 0 {size} {size}" class="-rotate-90" aria-hidden="true">
		<circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke-width={stroke} class="stroke-surface-2" />
		<circle
			cx={size / 2}
			cy={size / 2}
			r={radius}
			fill="none"
			stroke-width={stroke}
			stroke-linecap="round"
			stroke-dasharray={circumference}
			stroke-dashoffset={circumference * (1 - clamped)}
			style:--circ={circumference}
			class="ring-arc stroke-(--accent)"
		/>
	</svg>
	{#if children}
		<div class="absolute inset-0 grid place-items-center text-center font-heading font-bold">
			{@render children()}
		</div>
	{/if}
</div>