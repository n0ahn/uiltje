<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import Owl from '#lib/components/ui/Owl.svelte';
	import GameArt from '#lib/components/minigames/art/GameArt.svelte';
	import { GAMES } from '#lib/components/minigames/config.js';
	import MinigamesSkeleton from '#lib/components/skeleton/MinigamesSkeleton.svelte';
	import type { StudySet } from '#lib/schema/types.js';
	import { getStorage } from '#lib/storage/index.js';

	// The minigames of one set: pick a game. The games practise the same set as the other modes and count towards the progress.
	let set = $state<StudySet | null>(null);
	let missing = $state(false);
	const id = $derived(page.params.id ?? '');
	// ?selection=1 (Oefen selectie) is passed on to the game.
	const query = $derived(page.url.searchParams.get('selection') === '1' ? '?selection=1' : '');
	const rowTotal = $derived(set ? set.lists.reduce((sum, list) => sum + list.rows.length, 0) : 0);

	onMount(async () => {
		const found = await getStorage().getSet(id);
		if (found) set = found;
		else missing = true;
	});
</script>

<svelte:head><title>Minigames{set ? ` · ${set.title}` : ''} · Uiltje</title></svelte:head>

{#if missing}
	<div class="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
		<Owl pose="sleepy" size={96} />
		<h1 class="font-heading text-2xl font-semibold">Deze set bestaat niet (meer)</h1>
		<Button href="/sets">Naar mijn sets</Button>
	</div>
{:else if !set}
	<MinigamesSkeleton />
{:else}
	<div class="flex flex-col gap-5">
		<a href="/sets/{set.id}" class="inline-flex w-fit items-center gap-1 text-sm font-semibold text-text-muted hover:text-text"><Icon name="chevron-left" size={18} /> {set.title}</a>

		<div class="flex items-center gap-4">
			<div class="flex min-w-0 flex-1 flex-col gap-1">
				<h1 class="font-heading text-3xl font-semibold">Minigames</h1>
				<p class="text-text-muted">Oefen {set.title} met een spel. Wat je goed of fout doet telt mee voor je voortgang, net als bij de andere manieren van oefenen.</p>
			</div>
			<Owl pose="cheer" size={72} class="hidden sm:block" />
		</div>

		<ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
			{#each GAMES as game, i (game.id)}
				<li class="flex">
					<Card padded={false} rise={i} class={['flex w-full flex-col gap-3 p-4', !game.ready && 'opacity-90']}>
						<GameArt kind={game.art} />
						<div class="flex items-start justify-between gap-2">
							<h2 class="font-heading text-xl font-semibold">{game.name}</h2>
							{#if !game.ready}<span class="rounded-full bg-surface-2 px-2.5 py-0.5 text-sm font-semibold text-text-muted">Binnenkort</span>{/if}
						</div>
						<p class="text-text-muted">{game.text}</p>
						<ul class="flex flex-wrap gap-1.5" aria-label="Geschikt voor">
							{#each game.for as item (item)}<li class="rounded-full bg-surface-2 px-2.5 py-0.5 text-sm font-semibold text-text-muted">{item}</li>{/each}
						</ul>
						<div class="mt-auto pt-1">
							{#if game.ready}
								{#if rowTotal >= 2}
									<Button href="/sets/{set.id}/minigames/{game.id}{query}" size="lg" class="w-full"><Icon name="play" size={20} /> Spelen</Button>
								{:else}
									<button type="button" class="btn w-full" data-size="lg" disabled>Te weinig onderdelen</button>
								{/if}
							{:else}
								<button type="button" class="btn w-full" data-size="lg" data-variant="secondary" disabled>Binnenkort</button>
							{/if}
						</div>
					</Card>
				</li>
			{/each}
		</ul>
	</div>
{/if}
