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
	let menu: HTMLElement | undefined = $state();
	let position = $state({ top: 0, left: 0 });

	// The menu lives in the browser's top layer (Popover API), so no card, button or transform can ever cover it.
	// We place it ourselves next to the button, and flip it above the button when there is no room below.
	function place() {
		if (!button || !menu) return;
		const anchor = button.getBoundingClientRect();
		const { offsetWidth: width, offsetHeight: height } = menu;
		const margin = 8;
		let left = align === 'right' ? anchor.right - width : anchor.left;
		left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
		let top = anchor.bottom + margin;
		if (top + height > window.innerHeight - margin && anchor.top - height - margin > 0) top = anchor.top - height - margin;
		position = { top, left };
	}

	$effect(() => {
		if (!menu) return;
		if (open) {
			if (!menu.matches(':popover-open')) menu.showPopover();
			place();
			const reposition = () => place();
			window.addEventListener('resize', reposition);
			window.addEventListener('scroll', reposition, true);
			return () => {
				window.removeEventListener('resize', reposition);
				window.removeEventListener('scroll', reposition, true);
			};
		}
		if (menu.matches(':popover-open')) menu.hidePopover();
	});

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

	<div
		bind:this={menu}
		popover="manual"
		role="menu"
		aria-label={label}
		tabindex="-1"
		onclick={() => close(false)}
		onkeydown={() => {}}
		style:top="{position.top}px"
		style:left="{position.left}px"
		class="inset-auto m-0 min-w-64 animate-[pop-in_160ms_var(--ease-cozy)] rounded-card border border-border bg-surface p-2 text-text shadow-card"
	>
		{#if open}{@render children()}{/if}
	</div>
</div>
