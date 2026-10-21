<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '../../state/auth.svelte';
	import { palette } from '../../state/palette.svelte';
	import { isApplePlatform } from '../../utils/platform';
	import Button from '../ui/Button.svelte';
	import Icon from '../ui/Icon.svelte';
	import type { IconName } from '../ui/Icon.svelte';
	import NotificationBell from './NotificationBell.svelte';
	import ProfileMenu from './ProfileMenu.svelte';
	import ThemeToggle from './ThemeToggle.svelte';

	/** Without a title only the actions are shown (every page except the dashboard). */
	type Props = { title?: string; subtitle?: string; icon?: IconName; name: string; username: string };
	let { title, subtitle, icon, name, username }: Props = $props();

	// The OS is only known in the browser, so the hint appears after mount (⌘ K on Apple, Ctrl K elsewhere).
	// The shortcut itself lives in CommandPalette.
	let apple = $state<boolean | null>(null);
	onMount(() => (apple = isApplePlatform()));
</script>

<!-- On a phone the buttons come first (right-aligned, easy to reach) and the greeting sits under them. -->
<header class="flex flex-wrap items-start gap-3 sm:flex-nowrap sm:gap-4">
	{#if title}
	<div class="min-w-0 flex-1 max-sm:order-2 max-sm:basis-full">
		<h1 class="flex items-center gap-2">
			<span class="min-w-0 wrap-break-word">{title}</span>
			{#if icon}<Icon name={icon} size={26} class="text-flame" />{/if}
		</h1>
		{#if subtitle}<p class="mt-1 text-text-muted">{subtitle}</p>{/if}
	</div>
	{/if}

	<!-- Actions: on a phone they sit on their own row above the title. -->
	<div class={['flex items-center gap-3 sm:gap-4', title ? 'max-sm:order-1 max-sm:w-full max-sm:justify-end' : 'ml-auto w-full justify-end']}>
		<!-- Looks like a search field, opens the command palette. -->
		<button
			type="button"
			onclick={() => palette.show()}
			aria-haspopup="dialog"
			aria-keyshortcuts={apple === null ? undefined : apple ? 'Meta+K' : 'Control+K'}
			class="hidden h-11 w-90 max-w-full cursor-text items-center gap-2 rounded-full border border-border bg-surface px-4 text-left text-text-muted transition-colors duration-150 hover:border-primary md:flex"
		>
			<Icon name="search" size={18} />
			<span class="min-w-0 flex-1 truncate">Zoek sets, vakken of vrienden…</span>
			{#if apple !== null}
				<kbd class="inline-flex min-w-10 justify-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 font-body text-xs font-semibold">
					{#if apple}<span aria-label="Command">⌘</span>{:else}<span>Ctrl</span>{/if}<span>K</span>
				</kbd>
			{/if}
		</button>
		<Button variant="secondary" size="sm" iconOnly class="md:hidden" aria-label="Zoeken" onclick={() => palette.show()}>
			<Icon name="search" size={18} />
		</Button>

		<NotificationBell />
		<ThemeToggle />
		{#if !auth.user}
			<Button href="/login" size="sm" class="sm:hidden">
				<Icon name="log-in" size={16} />
				Inloggen
			</Button>
		{/if}
		<div class={auth.user ? '' : 'max-sm:hidden'}>
			<ProfileMenu {name} {username} variant="avatar" showSettings />
		</div>
	</div>
</header>