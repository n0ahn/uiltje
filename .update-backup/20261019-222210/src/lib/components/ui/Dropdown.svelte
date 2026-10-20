<script lang="ts">
	import { tick } from 'svelte';
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	// A button that opens a small menu (MenuItem rows). Closes on Esc, outside click and after choosing.
	// Arrow keys move through the items. `label` is the accessible name of the button.
	type Props = {
		label: string;
		variant?: 'primary' | 'secondary' | 'sage' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		iconOnly?: boolean;
		/** Show a small chevron after the content (not for icon-only buttons). */
		chevron?: boolean;
		align?: 'left' | 'right';
		class?: string;
		trigger: Snippet;
		children: Snippet;
	};
	let { label, variant = 'primary', size = 'md', iconOnly = false, chevron = true, align = 'left', class: className = '', trigger, children }: Props = $props();

	let open = $state(false);
	let root: HTMLElement | undefined = $state();
	let button: HTMLButtonElement | undefined = $state();

	const items = () => [...(root?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [])];

	async function toggle() {
		open = !open;
		if (open) {
			await tick();
			items()[0]?.focus();
		}
	}

	function close(refocus = true) {
		open = false;
		if (refocus) button?.focus();
	}

	function onkeydown(event: KeyboardEvent) {
		if (!open) {
			if (event.key === 'ArrowDown' && event.target === button) {
				event.preventDefault();
				void toggle();
			}
			return;
		}
		if (event.key === 'Escape') {
			event.preventDefault();
			close();
		} else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			const list = items();
			const at = list.indexOf(document.activeElement as HTMLElement);
			const next = event.key === 'ArrowDown' ? (at + 1) % list.length : (at - 1 + list.length) % list.length;
			list[next]?.focus();
		} else if (event.key === 'Tab') {
			open = false;
		}
	}

	function onWindowClick(event: MouseEvent) {
		if (open && root && !root.contains(event.target as Node)) open = false;
	}
</script>

<svelte:window onclick={onWindowClick} />

<div bind:this={root} class="relative inline-block" {onkeydown} role="presentation">
	<button
		bind:this={button}
		type="button"
		class={['btn', className]}
		data-variant={variant}
		data-size={size}
		data-icon={iconOnly || undefined}
		aria-label={label}
		aria-haspopup="menu"
		aria-expanded={open}
		onclick={toggle}
	>
		{@render trigger()}
		{#if chevron && !iconOnly}<Icon name="chevron-down" size={18} />{/if}
	</button>

	{#if open}
		<!-- A choice closes the menu (clicks bubble up from the items). -->
		<div
			role="menu"
			aria-label={label}
			tabindex="-1"
			onclick={() => close(false)}
			onkeydown={() => {}}
			class={[
				'absolute z-40 mt-2 min-w-64 animate-[pop-in_160ms_var(--ease-cozy)] rounded-card border border-border bg-surface p-2 shadow-card',
				align === 'right' ? 'right-0' : 'left-0'
			]}
		>
			{@render children()}
		</div>
	{/if}
</div>