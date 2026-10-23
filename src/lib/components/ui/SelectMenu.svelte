<script lang="ts" generics="T extends string">
	import Dropdown from './Dropdown.svelte';
	import Icon from './Icon.svelte';
	import MenuItem from './MenuItem.svelte';

	// A custom select: a button with the current choice that opens a menu (replaces the native <select>).
	type Choice = { id: T; name: string };
	type Props = {
		/** Accessible name and the small prefix before the current choice, e.g. "Sorteren". */
		label: string;
		options: readonly Choice[];
		value: T;
		align?: 'left' | 'right';
		size?: 'sm' | 'md' | 'lg';
		onchange?: (value: T) => void;
	};
	let { label, options, value = $bindable(), align = 'left', size = 'md', onchange }: Props = $props();

	const current = $derived(options.find((o) => o.id === value));
</script>

<Dropdown label="{label}: {current?.name ?? ''}" variant="secondary" {size} {align}>
	{#snippet trigger()}<span class="font-normal text-text-muted">{label}</span> {current?.name ?? ''}{/snippet}
	{#each options as option (option.id)}
		<MenuItem icon={option.id === value ? 'check' : undefined} onclick={() => { value = option.id; onchange?.(option.id); }}>{option.name}</MenuItem>
	{/each}
</Dropdown>
