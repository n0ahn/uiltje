<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon, { type IconName } from './Icon.svelte';

	// One row of a Dropdown. A link when it has an href, otherwise a button. `soon` shows "Binnenkort" and disables it.
	type Props = {
		href?: string;
		onclick?: () => void;
		icon?: IconName;
		/** Small badge after the label, e.g. "Aanbevolen". */
		badge?: string;
		soon?: boolean;
		danger?: boolean;
		children: Snippet;
	};
	let { href, onclick, icon, badge, soon = false, danger = false, children }: Props = $props();
</script>

<svelte:element
	this={href && !soon ? 'a' : 'button'}
	role="menuitem"
	href={href && !soon ? href : undefined}
	type={href && !soon ? undefined : 'button'}
	disabled={soon || undefined}
	aria-disabled={soon || undefined}
	tabindex="-1"
	{onclick}
	class={[
		'flex w-full items-center gap-3 rounded-tile px-3 py-2.5 text-left font-heading font-semibold outline-none',
		soon ? 'cursor-not-allowed text-text-muted opacity-70' : 'hover:bg-surface-2 focus-visible:bg-surface-2',
		danger && !soon && 'text-rose-edge'
	]}
>
	{#if icon}<Icon name={icon} size={20} class="shrink-0 text-text-muted" />{/if}
	<span class="min-w-0 flex-1 truncate">{@render children()}</span>
	{#if soon}
		<span class="rounded-full bg-surface-2 px-2.5 py-0.5 font-body text-xs font-semibold whitespace-nowrap">Binnenkort</span>
	{:else if badge}
		<span class="rounded-md bg-wheat px-2 py-0.5 font-body text-xs font-bold tracking-wide whitespace-nowrap text-on-accent uppercase">{badge}</span>
	{/if}
</svelte:element>
