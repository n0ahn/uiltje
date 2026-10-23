<script lang="ts">
	import type { PageProps } from './$types';
	import ProfileView from '#lib/components/social/ProfileView.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Owl from '#lib/components/ui/Owl.svelte';
	import { username } from '#lib/utils/user.js';

	let { data }: PageProps = $props();
	// The sign-in metadata follows name changes (see updateProfile), so it is the current @username.
	const me = $derived(username(data.user));
</script>

<svelte:head><title>Profiel · Uiltje</title></svelte:head>

{#if !data.user}
	<Card class="mx-auto flex max-w-lg flex-col items-center gap-3 py-10 text-center">
		<Owl pose="idle" size={96} />
		<h1 class="font-heading text-2xl font-semibold">Log in voor een profiel</h1>
		<p class="max-w-md text-text-muted">Met een account kies je een profielfoto, voeg je vrienden toe en zie je je statistieken.</p>
		<Button href="/login">Inloggen</Button>
	</Card>
{:else}
	{#key me}<ProfileView username={me} />{/key}
{/if}
