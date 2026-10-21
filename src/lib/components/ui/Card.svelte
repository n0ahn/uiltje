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
		/** Entrance: the card rises into place. The number is its place in the stagger (0 = first). */
		rise?: number;
		/** Hides a decorative card (e.g. a skeleton) from screen readers. */
		'aria-hidden'?: 'true' | boolean;
		class?: string;
		children: Snippet;
	};

	let { accent = 'primary', interactive = false, href, padded = true, rise, class: className = '', 'aria-hidden': ariaHidden, children }: Props = $props();
	const lifts = $derived(interactive || href !== undefined);
</script>

<svelte:element
	this={href ? 'a' : 'div'}
	{href}
	aria-hidden={ariaHidden}
	style={rise === undefined ? accentStyle(accent) : `${accentStyle(accent)}; --i: ${rise}`}
	class={[
		'rounded-card border border-border bg-surface shadow-card',
		href && 'block',
		padded && 'p-5',
		rise !== undefined && 'rise',
		lifts && 'lift hover:border-(--accent)',
		className
	]}
>
	{@render children()}
</svelte:element>