<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import Owl from '#lib/components/ui/Owl.svelte';
	import CardGridSkeleton from '#lib/components/skeleton/CardGridSkeleton.svelte';
	import { getStorage } from '#lib/storage/index.js';
	import type { SetSummary } from '#lib/storage/adapter.js';
	import { sameSubject, subjectSlug } from '#lib/utils/subject.js';

	// SvelteKit has already decoded the route parameter.
	const subject = $derived(page.params.subject ?? '');
	let sets = $state<SetSummary[] | null>(null);
	const name = $derived(sets?.[0]?.subject.trim() || subject);

	onMount(async () => {
		const all = await getStorage().listSets();
		sets = all.filter((s) => sameSubject(s.subject, subject));
	});
</script>

<svelte:head><title>{name} · Uiltje</title></svelte:head>

<div class="mb-6 flex flex-wrap items-center gap-3">
	<Button href="/vakken" variant="ghost" size="sm" iconOnly aria-label="Terug naar vakken"><Icon name="arrow-left" size={20} /></Button>
	<h1 class="min-w-0 flex-1 truncate font-heading text-3xl font-semibold">{name}</h1>
	{#if sets && sets.length > 0}
		<Button href="/vak/{subjectSlug(name)}/practice"><Icon name="play" size={18} /> Oefen alles van {name}</Button>
	{/if}
</div>

{#if sets === null}
	<CardGridSkeleton />
{:else if sets.length === 0}
	<div class="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
		<Owl pose="sleepy" size={96} />
		<h2 class="font-heading text-2xl font-semibold">Geen sets voor dit vak</h2>
		<p class="text-text-muted">Maak een set en kies "{name}" als vak.</p>
		<Button href="/sets/new">Nieuwe set</Button>
	</div>
{:else}
	<p class="mb-4 text-text-muted">Oefen één set, of kies bij "Oefen alles" rijtjes uit meerdere sets tegelijk.</p>
	<ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
		{#each sets as set (set.id)}
			<li>
				<Card class="flex h-full flex-col gap-3">
					<div class="min-w-0">
						<h2 class="truncate font-heading text-lg font-semibold">{set.title}</h2>
						{#if set.folder}<p class="truncate text-sm text-text-muted">{set.folder}</p>{/if}
						<p class="mt-1 text-sm text-text-muted">{set.listCount} {set.listCount === 1 ? 'rijtje' : 'rijtjes'} · {set.rowCount} {set.rowCount === 1 ? 'rij' : 'rijen'}</p>
					</div>
					<div class="mt-auto flex flex-wrap gap-2">
						<Button href="/sets/{set.id}/practice" size="sm"><Icon name="play" size={16} /> Oefenen</Button>
						<Button href="/sets/{set.id}/edit" variant="secondary" size="sm"><Icon name="pencil" size={16} /> Bewerken</Button>
					</div>
				</Card>
			</li>
		{/each}
	</ul>
{/if}
