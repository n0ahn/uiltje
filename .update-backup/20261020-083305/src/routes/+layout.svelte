<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import AppShell from '#lib/components/shell/AppShell.svelte';
	import { installClickSounds } from '#lib/audio/clicks.js';
	import { settings } from '#lib/state/settings.svelte.js';
	import { displayName, username } from '#lib/utils/user.js';

	let { data, children }: LayoutProps = $props();
	let { supabase, session } = $derived(data);

	onMount(() => {
		void settings.load();
		const removeClicks = installClickSounds();
		const { data: sub } = supabase.auth.onAuthStateChange((_, newSession) => {
			if (newSession?.expires_at !== session?.expires_at) invalidate('supabase:auth');
		});
		return () => {
			removeClicks();
			sub.subscription.unsubscribe();
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<AppShell name={displayName(data.user)} username={username(data.user)}>
	{@render children()}
</AppShell>