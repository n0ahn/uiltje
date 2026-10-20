<script lang="ts">
	import { accentFor, accentStyle } from './accent';

	/** `src`: profile photo; without one (or when it fails to load) the initial on a colored circle is shown. */
	type Props = { name: string; size?: number; src?: string | null; class?: string };
	let { name, size = 40, src = null, class: className = '' }: Props = $props();

	const initial = $derived((name.trim()[0] ?? '?').toUpperCase());
	let brokenSrc = $state<string | null>(null);
</script>

<span
	style="{accentStyle(accentFor(name))}; width:{size}px; height:{size}px; font-size:{Math.round(size * 0.45)}px"
	class={['inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-(--accent) font-heading font-semibold text-on-accent', className]}
	aria-hidden="true"
>
	{#if src && src !== brokenSrc}
		<img {src} alt="" width={size} height={size} class="size-full object-cover" onerror={() => (brokenSrc = src)} />
	{:else}
		{initial}
	{/if}
</span>
