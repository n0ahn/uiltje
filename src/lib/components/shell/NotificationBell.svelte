<script lang="ts">
	import { notifications } from '../../state/notifications.svelte';
	import { timeAgo } from '../../notifications/format';
	import type { AppNotification, NotificationKind } from '../../notifications/types';
	import Avatar from '../ui/Avatar.svelte';
	import Button from '../ui/Button.svelte';
	import Icon from '../ui/Icon.svelte';
	import type { IconName } from '../ui/Icon.svelte';
	import Owl from '../ui/Owl.svelte';
	import Skeleton from '../ui/Skeleton.svelte';

	// Bell with an unread badge and a panel with all notifications. The panel lives in the top layer (Popover API),
	// like Dropdown, and is placed next to the button. Closing it marks what you saw as read.
	type Props = { align?: 'left' | 'right'; class?: string };
	let { align = 'right', class: className = '' }: Props = $props();

	const ICONS: Record<NotificationKind, IconName> = {
		'friend-request': 'user-plus',
		'friend-accepted': 'users',
		share: 'share',
		'dispute-reply': 'check',
		welcome: 'sparkles',
		streak: 'flame',
		milestone: 'trophy'
	};
	const TONES: Record<NotificationKind, string> = {
		'friend-request': 'bg-primary-soft text-primary-text',
		'friend-accepted': 'bg-primary-soft text-primary-text',
		share: 'bg-primary-soft text-primary-text',
		'dispute-reply': 'bg-sage-soft text-text',
		welcome: 'bg-sage-soft text-text',
		streak: 'bg-surface-2 text-flame',
		milestone: 'bg-surface-2 text-flame'
	};

	let open = $state(false);
	let root: HTMLElement | undefined = $state();
	let button: HTMLButtonElement | undefined = $state();
	let panel: HTMLElement | undefined = $state();
	let position = $state({ top: 0, left: 0 });
	// What was unread when the panel opened: those rows keep their highlight while it is open.
	let unreadAtOpen = $state<string[]>([]);

	const count = $derived(notifications.unread);
	const label = $derived(count > 0 ? `Meldingen, ${count} ongelezen` : 'Meldingen');

	function place() {
		if (!button || !panel) return;
		const anchor = button.getBoundingClientRect();
		const { offsetWidth: width, offsetHeight: height } = panel;
		const margin = 8;
		let left = align === 'right' ? anchor.right - width : anchor.left;
		left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
		let top = anchor.bottom + margin;
		if (top + height > window.innerHeight - margin && anchor.top - height - margin > 0) top = anchor.top - height - margin;
		position = { top, left };
	}

	$effect(() => {
		if (!panel) return;
		if (open) {
			if (!panel.matches(':popover-open')) panel.showPopover();
			place();
			const reposition = () => place();
			window.addEventListener('resize', reposition);
			window.addEventListener('scroll', reposition, true);
			return () => {
				window.removeEventListener('resize', reposition);
				window.removeEventListener('scroll', reposition, true);
			};
		}
		if (panel.matches(':popover-open')) panel.hidePopover();
	});

	function toggle() {
		if (open) return close();
		unreadAtOpen = notifications.items.filter((n) => !notifications.isRead(n.id)).map((n) => n.id);
		open = true;
		void notifications.refresh(true);
	}

	function close(refocus = true) {
		if (!open) return;
		open = false;
		notifications.markAllRead();
		if (refocus) button?.focus();
	}

	function onkeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') {
			event.preventDefault();
			close();
		}
	}

	function onWindowClick(event: MouseEvent) {
		if (open && root && !root.contains(event.target as Node)) close(false);
	}

	const isNew = (n: AppNotification) => unreadAtOpen.includes(n.id);
</script>

<svelte:window onclick={onWindowClick} />

<div bind:this={root} class={['relative inline-block', className]} {onkeydown} role="presentation">
	<button
		bind:this={button}
		type="button"
		class="btn relative"
		data-variant="secondary"
		data-size="sm"
		data-icon
		aria-label={label}
		aria-haspopup="dialog"
		aria-expanded={open}
		onclick={toggle}
	>
		<!-- A new notification makes the bell ring once and the badge pop in. -->
		{#key count}
			<span class={['grid origin-top place-items-center', count > 0 && 'animate-[bell-ring_900ms_ease-in-out_200ms]']}>
				<Icon name="bell" size={18} />
			</span>
		{/key}
		{#if count > 0}
			{#key count}
			<span
				class="absolute -top-2 -right-2 grid min-w-5 animate-[badge-pop_420ms_var(--ease-spring)] place-items-center rounded-full border-2 border-surface bg-primary-btn px-1 font-heading text-xs leading-4 font-bold text-on-primary"
				aria-hidden="true"
			>
				{count > 9 ? '9+' : count}
			</span>
			{/key}
		{/if}
	</button>

	<div
		bind:this={panel}
		popover="manual"
		role="dialog"
		aria-label="Meldingen"
		tabindex="-1"
		style:top="{position.top}px"
		style:left="{position.left}px"
		class="inset-auto m-0 w-[min(24rem,calc(100vw-1rem))] menu-pop rounded-card border border-border bg-surface text-text shadow-card"
	>
		{#if open}
			<div class="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
				<h2 class="text-lg">Meldingen</h2>
				<Button variant="ghost" size="sm" disabled={count === 0} onclick={() => notifications.markAllRead()}>Alles gelezen</Button>
			</div>

			<div class="max-h-[min(28rem,70dvh)] overflow-y-auto p-2">
				{#if !notifications.loaded}
					<div role="status" aria-busy="true" class="flex flex-col gap-2 p-1">
						<span class="sr-only">Laden…</span>
						{#each [0, 1, 2] as i (i)}
							<div class="flex gap-3 p-2">
								<Skeleton class="size-10 shrink-0 rounded-full" />
								<div class="flex flex-1 flex-col gap-2">
									<Skeleton class="h-4 w-2/3" />
									<Skeleton class="h-3 w-full" />
								</div>
							</div>
						{/each}
					</div>
				{:else if notifications.items.length === 0}
					<div class="flex flex-col items-center gap-2 px-4 py-8 text-center">
						<Owl pose="sleepy" size={64} />
						<p class="text-text-muted">Geen meldingen. Het is lekker rustig hier.</p>
					</div>
				{:else}
					<ul class="flex flex-col gap-1">
						{#each notifications.items as n (n.id)}
							<li>
								{#if n.href}
									<a
										href={n.href}
										onclick={() => close(false)}
										class={['flex gap-3 rounded-tile p-2.5 text-left transition-colors duration-150 hover:bg-surface-2 focus-visible:bg-surface-2', isNew(n) && 'bg-surface-2']}
									>
										{@render row(n)}
									</a>
								{:else}
									<div class={['flex gap-3 rounded-tile p-2.5 text-left', isNew(n) && 'bg-surface-2']}>
										{@render row(n)}
									</div>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}
	</div>
</div>

{#snippet row(n: AppNotification)}
{#if n.person}
	<Avatar name={n.person.name} src={n.person.avatarUrl} size={40} />
{:else}
	<span class={['grid size-10 shrink-0 place-items-center rounded-full', TONES[n.kind]]}>
		<Icon name={ICONS[n.kind]} size={20} />
	</span>
{/if}
<span class="min-w-0 flex-1">
	<span class="flex items-start gap-2">
		<span class="min-w-0 flex-1 font-heading leading-snug font-semibold">{n.title}</span>
		{#if isNew(n)}<span class="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" aria-label="Nieuw"></span>{/if}
	</span>
	<span class="mt-0.5 block text-sm text-text-muted">{n.text}</span>
	<span class="mt-1 block text-xs font-semibold text-text-muted">{timeAgo(n.createdAt)}</span>
</span>
{/snippet}
