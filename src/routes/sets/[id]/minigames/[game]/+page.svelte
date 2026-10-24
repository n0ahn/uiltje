<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { gameById, type CatchConfig, type MemoryConfig } from '#lib/components/minigames/config.js';
	import MemoryRunner from '#lib/components/minigames/MemoryRunner.svelte';
	import MemoryStart from '#lib/components/minigames/MemoryStart.svelte';
	import UilenvangstRunner from '#lib/components/minigames/UilenvangstRunner.svelte';
	import UilenvangstStart from '#lib/components/minigames/UilenvangstStart.svelte';
	import PracticeSkeleton from '#lib/components/skeleton/PracticeSkeleton.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Owl from '#lib/components/ui/Owl.svelte';
	import type { StudySet } from '#lib/schema/types.js';
	import { settings } from '#lib/state/settings.svelte.js';
	import { getStorage } from '#lib/storage/index.js';
	import { onlyPicked, readSelection } from '#lib/utils/selection.js';

	// One minigame: start screen -> game -> result. Uilenvangst and Uilen-memory are playable so far; the other games show Binnenkort on the hub.
	let set = $state<StudySet | null>(null);
	let missing = $state(false);
	let partial = $state(false);
	let config = $state<CatchConfig | null>(null);
	let memoryConfig = $state<MemoryConfig | null>(null);
	let run = $state(0);

	const game = $derived(gameById(page.params.game ?? ''));
	const playable = $derived(game?.id === 'uilenvangst' || game?.id === 'uilen-memory');
	const hubHref = $derived(`/sets/${page.params.id ?? ''}/minigames${page.url.searchParams.get('selection') === '1' ? '?selection=1' : ''}`);

	onMount(async () => {
		await settings.load();
		const found = await getStorage().getSet(page.params.id ?? '');
		if (!found) {
			missing = true;
			return;
		}
		// ?selection=1: only the terms picked on the set page, like in the other practice modes.
		const picked = page.url.searchParams.get('selection') === '1' ? readSelection(found.id) : null;
		const part = picked ? onlyPicked(found, picked) : null;
		if (part && part.lists.length > 0) {
			set = part;
			partial = true;
		} else set = found;
	});

	function restart(next: CatchConfig | null) {
		config = next;
		run++;
	}
	function restartMemory(next: MemoryConfig | null) {
		memoryConfig = next;
		run++;
	}
</script>

{#if missing || (game && !playable)}
	<div class="min-h-dvh bg-bg px-4 py-6 sm:px-8 sm:py-10">
		<div class="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
			<Owl pose="sleepy" size={96} />
			<h1 class="font-heading text-2xl font-semibold">{missing ? 'Deze set bestaat niet (meer)' : `${game?.name} komt binnenkort`}</h1>
			<Button href={missing ? '/sets' : hubHref}>{missing ? 'Naar mijn sets' : 'Naar de minigames'}</Button>
		</div>
	</div>
{:else if !game}
	<div class="min-h-dvh bg-bg px-4 py-6 sm:px-8 sm:py-10">
		<div class="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
			<Owl pose="oops" size={96} />
			<h1 class="font-heading text-2xl font-semibold">Deze game bestaat niet</h1>
			<Button href={hubHref}>Naar de minigames</Button>
		</div>
	</div>
{:else}
	<div class="min-h-dvh bg-bg px-4 py-6 sm:px-8 sm:py-10">
		{#if !set}
			<PracticeSkeleton />
		{:else if game.id === 'uilen-memory'}
			{#if !memoryConfig}
				<MemoryStart sets={[set]} title={partial ? `${set.title} (selectie)` : set.title} {hubHref} onstart={(c) => (memoryConfig = c)} />
			{:else}
				{#key run}
					<MemoryRunner sets={[set]} config={memoryConfig} title={partial ? `${set.title} (selectie)` : set.title} backHref="/sets/{set.id}" {hubHref} onrestart={restartMemory} />
				{/key}
			{/if}
		{:else if !config}
			<UilenvangstStart sets={[set]} title={partial ? `${set.title} (selectie)` : set.title} {hubHref} onstart={(c) => (config = c)} />
		{:else}
			{#key run}
				<UilenvangstRunner sets={[set]} {config} title={partial ? `${set.title} (selectie)` : set.title} backHref="/sets/{set.id}" {hubHref} onrestart={restart} />
			{/key}
		{/if}
	</div>
{/if}
