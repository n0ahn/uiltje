<script lang="ts">
	import type { PageProps } from './$types';
	import { page } from '$app/state';
	import SharedSetView from '#lib/components/social/SharedSetView.svelte';
	import { getSocial } from '#lib/social/index.js';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Gedeelde set · Uiltje</title></svelte:head>

{#key page.params.token}
	<SharedSetView load={() => getSocial().getSharedSet(page.params.token ?? '')} signedIn={!!data.user} />
{/key}
