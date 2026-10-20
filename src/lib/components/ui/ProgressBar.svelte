<script lang="ts">
	import { accentStyle } from './accent';
	import type { Accent } from './accent';

	type Props = {
		/** 0..1 */
		value: number;
		accent?: Accent;
		/** Accessible name, e.g. "Voortgang Latijn". */
		label: string;
		class?: string;
	};

	let { value, accent = 'sage', label, class: className = '' }: Props = $props();
	const pct = $derived(Math.round(Math.min(1, Math.max(0, value)) * 100));
</script>

<div
	role="progressbar"
	aria-label={label}
	aria-valuemin="0"
	aria-valuemax="100"
	aria-valuenow={pct}
	style={accentStyle(accent)}
	class={['h-2.5 w-full overflow-hidden rounded-full bg-surface-2', className]}
>
	<div
		class="h-full rounded-full bg-(--accent) shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] transition-[width] duration-400 ease-cozy"
		style:width="{pct}%"
	></div>
</div>