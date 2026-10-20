<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import Toast from '../ui/Toast.svelte';
	import BottomNav from './BottomNav.svelte';
	import Sidebar from './Sidebar.svelte';
	import CommandPalette from './CommandPalette.svelte';

	type Props = { name: string; username: string; children: Snippet };
	let { name, username, children }: Props = $props();

	// Screens that bring their own full-page look: login (mint game world) and practice (distraction free).
	const path = $derived(page.url.pathname);
	const bare = $derived(path === '/login' || path.startsWith('/login/') || path.endsWith('/practice'));
</script>

{#if bare}
	{@render children()}
{:else}
	<a
		href="#main"
		class="sr-only z-50 rounded-full bg-surface px-4 py-2 font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
	>
		Naar de inhoud
	</a>
	<Sidebar {name} {username} />
	<div class="min-h-dvh sm:pl-18 lg:pl-62">
		<main id="main" class="mx-auto max-w-7xl px-4 pt-5 pb-28 sm:px-8 sm:pt-8 sm:pb-12">
			{@render children()}
		</main>
	</div>
	<BottomNav />
	<CommandPalette />
{/if}

<Toast />