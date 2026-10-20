<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Props = Omit<HTMLButtonAttributes, 'children' | 'class'> & {
		variant?: 'primary' | 'secondary' | 'sage' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		/** Square button holding only an icon (give it an aria-label). */
		iconOnly?: boolean;
		/** Renders a link styled as a button. */
		href?: string;
		class?: string;
		children: Snippet;
	};

	let {
		variant = 'primary',
		size = 'md',
		iconOnly = false,
		href,
		class: className = '',
		children,
		...rest
	}: Props = $props();
</script>

{#if href}
	<a
		{href}
		class={['btn', className]}
		data-variant={variant}
		data-size={size}
		data-icon={iconOnly || undefined}
		aria-label={rest['aria-label']}
		title={rest.title}
	>
		{@render children()}
	</a>
{:else}
	<button
		{...rest}
		class={['btn', className]}
		data-variant={variant}
		data-size={size}
		data-icon={iconOnly || undefined}
	>
		{@render children()}
	</button>
{/if}