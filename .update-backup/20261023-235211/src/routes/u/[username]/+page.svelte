<script lang="ts">
	import type { PageProps } from './$types';
	import { page } from '$app/state';
	import ProfileView from '#lib/components/social/ProfileView.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Owl from '#lib/components/ui/Owl.svelte';

	let { data }: PageProps = $props();
	const username = $derived(page.params.username ?? '');
</script>

<svelte:head><title>@{username} · Uiltje</title></svelte:head>

{#if !data.user}
	<Card class="mx-auto flex max-w-md flex-col items-center gap-3 py-10 text-center">
		<Owl pose="idle" size={96} />
		<h1 class="font-heading text-2xl font-semibold">Log in om profielen te zien</h1>
		<Button href="/login?next={encodeURIComponent(`/u/${username}`)}">Inloggen</Button>
	</Card>
{:else}
	{#key username}<ProfileView {username} />{/key}
{/if}
