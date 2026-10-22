<script lang="ts">
	import { auth } from '../../state/auth.svelte';
	import { profile } from '../../state/profile.svelte';
	import Avatar from '../ui/Avatar.svelte';
	import Dropdown from '../ui/Dropdown.svelte';
	import Icon from '../ui/Icon.svelte';
	import MenuItem from '../ui/MenuItem.svelte';

	// Account menu. `avatar` = round avatar button (top bar); `card` = avatar + name row (bottom of the sidebar).
	type Props = {
		name: string;
		username: string;
		variant: 'avatar' | 'card';
		/** The top-bar menu has an extra "Instellingen" entry (the sidebar already has one in the main menu). */
		showSettings?: boolean;
	};
	let { name, username, variant, showSettings = false }: Props = $props();
</script>

{#if variant === 'avatar'}
	<Dropdown label="Accountmenu" variant="ghost" size="sm" iconOnly chevron={false} align="right" class="rounded-full! hover:no-underline">
		{#snippet trigger()}<Avatar {name} src={profile.data?.avatarUrl} size={36} />{/snippet}
		{@render items()}
	</Dropdown>
{:else}
	<Dropdown
		label="Accountmenu"
		variant="ghost"
		chevron={false}
		class="w-full justify-center px-1! hover:no-underline lg:justify-start lg:px-2!"
	>
		{#snippet trigger()}
			<Avatar {name} src={profile.data?.avatarUrl} size={36} />
			<span class="hidden min-w-0 flex-1 text-left lg:block">
				<span class="block truncate text-sm leading-tight font-bold">{name}</span>
				<span class="block truncate font-body text-xs font-normal text-text-muted">@{username}</span>
			</span>
			<Icon name="chevron-down" size={16} class="hidden text-text-muted lg:block" />
		{/snippet}
		{@render items()}
	</Dropdown>
{/if}

{#snippet items()}
	{#if auth.user}<MenuItem icon="user" href="/profile">Profiel</MenuItem>{/if}
	{#if showSettings}<MenuItem icon="sliders" href="/settings">Instellingen</MenuItem>{/if}
	{#if auth.user}
		<MenuItem icon="log-out" danger onclick={() => auth.signOut()}>Uitloggen</MenuItem>
	{:else}
		<MenuItem icon="log-in" href="/login">Inloggen</MenuItem>
	{/if}
{/snippet}
