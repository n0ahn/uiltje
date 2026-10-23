<script lang="ts">
	import type { PageProps } from './$types';
	import { page } from '$app/state';
	import SharedSetView from '#lib/components/social/SharedSetView.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import { getSocial } from '#lib/social/index.js';

	let { data }: PageProps = $props();
	const id = $derived(page.params.id ?? '');
</script>

<svelte:head><title>Gedeelde set · Uiltje</title></svelte:head>

{#if !data.user}
	<Card class="mx-auto flex max-w-md flex-col items-center gap-3 py-10 text-center">
		<h1 class="font-heading text-2xl font-semibold">Log in om deze set te zien</h1>
		<Button href="/login?next={encodeURIComponent(`/gedeeld/${id}`)}">Inloggen</Button>
	</Card>
{:else}
	{#key id}
		<SharedSetView
			load={() => getSocial().getIncomingShare(id)}
			onadded={() => getSocial().respondToShare(id, true)}
			backHref="/friends"
			signedIn
		/>
	{/key}
{/if}
