<script lang="ts">
	import { page } from '$app/state';
	import SetOverview from '#lib/components/sets/SetOverview.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import { subjectSlug } from '#lib/utils/subject.js';

	// SvelteKit has already decoded the route parameter.
	const subject = $derived(page.params.subject ?? '');
	// Same overview as /sets (search, groups/folders, sort, organising), limited to this subject.
	let overview: SetOverview | undefined = $state();
	let selecting = $state(false);
	let total = $state<number | null>(null);
	let subjectName = $state('');
	const name = $derived(subjectName || subject);
</script>

<svelte:head><title>{name} · Uiltje</title></svelte:head>

<div class="mb-6 flex flex-wrap items-center gap-3">
	<Button href="/vakken" variant="ghost" size="sm" iconOnly aria-label="Terug naar vakken"><Icon name="arrow-left" size={20} /></Button>
	<h1 class="min-w-0 flex-1 truncate font-heading text-3xl font-semibold">{name}</h1>
	{#if selecting}
		<Button onclick={() => overview?.stopSelecting()}><Icon name="check" size={18} /> Klaar</Button>
	{:else if total !== null && total > 0}
		{#if total > 1}
			<Button variant="secondary" onclick={() => (selecting = true)}><Icon name="layers" size={18} /> Ordenen</Button>
		{/if}
		<Button href="/vak/{subjectSlug(name)}/practice"><Icon name="play" size={18} /> Oefen alles van {name}</Button>
	{/if}
</div>

{#if total !== null && total > 0 && !selecting}
	<p class="mb-4 text-text-muted">Oefen één set, of kies bij “Oefen alles” rijtjes uit meerdere sets tegelijk. Met “Ordenen” stop je sets in mappen, bijvoorbeeld per hoofdstuk.</p>
{/if}

<SetOverview bind:this={overview} bind:selecting bind:total bind:subjectName {subject} />
