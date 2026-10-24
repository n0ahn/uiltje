<script lang="ts">
	import ImportMenu from '#lib/components/editor/ImportMenu.svelte';
	import SetOverview from '#lib/components/sets/SetOverview.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';

	// All the finding and ordering lives in SetOverview, which the page of a subject uses too.
	let overview: SetOverview | undefined = $state();
	let selecting = $state(false);
	let total = $state<number | null>(null);
</script>

<svelte:head><title>Mijn sets · Uiltje</title></svelte:head>

<div class="mb-6 flex flex-wrap items-center gap-3">
	<h1 class="min-w-0 flex-1 font-heading text-3xl font-semibold">Mijn sets</h1>
	{#if selecting}
		<Button onclick={() => overview?.stopSelecting()}><Icon name="check" size={18} /> Klaar</Button>
	{:else}
		{#if total !== null && total > 1}
			<Button variant="secondary" onclick={() => (selecting = true)}><Icon name="layers" size={18} /> Ordenen</Button>
		{/if}
		<ImportMenu />
		<Button href="/bibliotheek" variant="secondary"><Icon name="cards" size={18} /> Kant en klaar</Button>
		<Button href="/sets/ai" variant="secondary"><Icon name="sparkles" size={18} /> Maken met AI</Button>
		<Button href="/sets/new"><Icon name="plus" size={18} /> Nieuwe set</Button>
	{/if}
</div>

<SetOverview bind:this={overview} bind:selecting bind:total />
