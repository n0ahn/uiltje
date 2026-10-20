<script lang="ts">
	import { accentFor, accentStyle } from './accent';

	type Props = { name: string; size?: number; class?: string };
	let { name, size = 40, class: className = '' }: Props = $props();

	const initial = $derived((name.trim()[0] ?? '?').toUpperCase());
</script>

<span
	style="{accentStyle(accentFor(name))}; width:{size}px; height:{size}px; font-size:{Math.round(size * 0.45)}px"
	class={['inline-grid shrink-0 place-items-center rounded-full bg-(--accent) font-heading font-semibold text-on-accent', className]}
	aria-hidden="true"
>
	{initial}
</span>