<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';
	import { invalidate } from '$app/navigation';
	import { isBrowser } from '@supabase/ssr';
	import { onMount, untrack } from 'svelte';
	import AppShell from '#lib/components/shell/AppShell.svelte';
	import { installClickSounds } from '#lib/audio/clicks.js';
	import GuestImportModal from '#lib/components/shell/GuestImportModal.svelte';
	import { auth } from '#lib/state/auth.svelte.js';
	import { overview } from '#lib/state/overview.svelte.js';
	import { guestImport } from '#lib/state/guest-import.svelte.js';
	import { settings } from '#lib/state/settings.svelte.js';
	import { useStorageFor } from '#lib/storage/index.js';
	import { displayName, username } from '#lib/utils/user.js';

	let { data, children }: LayoutProps = $props();
	let { supabase, session } = $derived(data);

	// Guest -> localStorage, signed in -> Supabase. Set before the page below is created, so its first read
	// already uses the right backend; the pre-effect handles a later login or logout. Never on the server.
	if (isBrowser()) untrack(() => useStorageFor(data.supabase, data.user?.id ?? null));
	$effect.pre(() => {
		auth.client = data.supabase;
		auth.user = data.user;
		if (isBrowser()) useStorageFor(data.supabase, data.user?.id ?? null);
	});

	// A login or logout changes whose settings are shown and whether guest data can be imported.
	let lastUserId: string | null | undefined;
	$effect(() => {
		const userId = data.user?.id ?? null;
		if (userId === lastUserId) return;
		const firstRun = lastUserId === undefined;
		lastUserId = userId;
		if (!firstRun) {
			settings.reset();
			overview.reset();
		}
		void settings.load();
		if (userId) guestImport.check(userId, true);
		else guestImport.reset();
	});

	onMount(() => {
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
<GuestImportModal />