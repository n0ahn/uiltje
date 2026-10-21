<script lang="ts">
	import type { Snippet } from 'svelte';
	import { accentStyle } from './accent';
	import type { Accent } from './accent';

	type Props = {
		/** Accent used for the hover border (interactive cards). */
		accent?: Accent;
		/** Lifts on hover. Implied when `href` is set. */
		interactive?: boolean;
		href?: string;
		/** Default padding is 20px; turn off for custom layouts (e.g. illustrated cards). */
		padded?: boolean;
		class?: string;
		children: Snippet;
	};

	let { accent = 'primary', interactive = false, href, padded = true, class: className = '', children }: Props = $props();
	const lifts = $derived(interactive || href !== undefined);
</script>

<svelte:element
	this={href ? 'a' : 'div'}
	{href}
	style={accentStyle(accent)}
	class={[
		'rounded-card border border-border bg-surface shadow-card',
		href && 'block',
		padded && 'p-5',
		lifts && 'transition duration-150 ease-cozy hover:-translate-y-0.5 hover:border-(--accent)',
		className
	]}
>
	{@render children()}
</svelte:element>