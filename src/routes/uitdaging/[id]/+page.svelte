<script lang="ts">
	import type { PageProps } from './$types';
	import { page } from '$app/state';
	import SharedSetView from '#lib/components/social/SharedSetView.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import { getSocial } from '#lib/social/index.js';

	// A challenge sent to you: look at the set, make your own copy (that is accepting), then take a test on it.
	let { data }: PageProps = $props();
	const id = $derived(page.params.id ?? '');
</script>

<svelte:head><title>Uitdaging · Uiltje</title></svelte:head>

{#if !data.user}
	<Card class="mx-auto flex max-w-md flex-col items-center gap-3 py-10 text-center">
		<h1 class="font-heading text-2xl font-semibold">Log in om deze uitdaging te zien</h1>
		<Button href="/login?next={encodeURIComponent(`/uitdaging/${id}`)}">Inloggen</Button>
	</Card>
{:else}
	<div class="mx-auto mb-4 flex max-w-xl items-start gap-3 rounded-card border border-border bg-surface p-4">
		<Icon name="trophy" size={24} class="mt-0.5 shrink-0" />
		<p><strong>Je bent uitgedaagd!</strong> Voeg de set toe aan je sets, maak een toets over de hele set (een deel telt niet mee) en kijk onder <a href="/uitdagingen" class="font-bold text-primary-text hover:underline">Uitdagingen</a> wie het hoogste cijfer haalt.</p>
	</div>
	{#key id}
		<SharedSetView
			load={() => getSocial().getChallengeSet(id)}
			onadded={(copyId) => getSocial().respondToChallenge(id, true, copyId)}
			backHref="/uitdagingen"
			signedIn
		/>
	{/key}
{/if}
