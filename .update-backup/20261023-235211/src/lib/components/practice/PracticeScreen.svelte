<script lang="ts">
	import PracticeSkeleton from '../skeleton/PracticeSkeleton.svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import type { StudySet } from '../../schema/types';
	import { settings } from '../../state/settings.svelte';
	import { getStorage } from '../../storage';
	import type { TestRecord } from '../../storage/adapter';
	import CardRunner from './CardRunner.svelte';
	import CardStart from './CardStart.svelte';
	import PracticeRunner from './PracticeRunner.svelte';
	import PracticeStart from './PracticeStart.svelte';
	import VocabRunner from './VocabRunner.svelte';
	import { isCardMode, type CardConfig, type PracticeConfig } from './config';

	// Start screen -> runner -> result, for one set or for all sets of a subject.
	type Props = { sets: StudySet[]; title: string; backHref: string };
	let { sets, title, backHref }: Props = $props();

	// ?mode=learn or ?mode=test comes from the practice menu on the set page.
	const modeParam = page.url.searchParams.get('mode');
	const initialMode = modeParam === 'test' ? 'test' : 'learn';
	// The other modes (flashcards, meerkeuze, dictee, spelling, hints) have their own short start screen and runner.
	const cardMode = isCardMode(modeParam) ? modeParam : null;
	let cardConfig = $state<CardConfig | null>(null);

	let ready = $state(false);
	let config = $state<PracticeConfig | null>(null);
	let run = $state(0);
	let results = $state<TestRecord[]>([]);

	async function refreshResults() {
		const ids = new Set(sets.map((set) => set.id));
		const all = await getStorage().listTestResults();
		results = all.filter((r) => r.setIds.some((id) => ids.has(id)));
	}

	onMount(async () => {
		await settings.load();
		await refreshResults();
		ready = true;
	});

	function restartCards(next: CardConfig | null) {
		cardConfig = next;
		run++;
	}

	function restart(next: PracticeConfig | null) {
		config = next;
		run++;
		if (!next) void refreshResults();
	}
</script>

<div class="min-h-dvh bg-bg px-4 py-6 sm:px-8 sm:py-10">
	{#if !ready}
		<PracticeSkeleton />
	{:else if cardMode}
		{#if !cardConfig}
			<CardStart {sets} {title} {backHref} mode={cardMode} onstart={(c) => (cardConfig = c)} />
		{:else}
			{#key run}<CardRunner {sets} config={cardConfig} {title} {backHref} onrestart={restartCards} />{/key}
		{/if}
	{:else if !config}
		<PracticeStart {sets} {title} {backHref} {results} {initialMode} onstart={(c) => (config = c)} />
	{:else}
		{#key run}
			{#if config.kind === 'woorden'}
				<VocabRunner {sets} {config} {title} {backHref} onrestart={restart} />
			{:else}
				<PracticeRunner {sets} {config} {title} {backHref} onrestart={restart} />
			{/if}
		{/key}
	{/if}
</div>
