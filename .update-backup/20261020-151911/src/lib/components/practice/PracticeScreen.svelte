<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import type { StudySet } from '../../schema/types';
	import { settings } from '../../state/settings.svelte';
	import { getStorage } from '../../storage';
	import type { TestRecord } from '../../storage/adapter';
	import PracticeRunner from './PracticeRunner.svelte';
	import PracticeStart from './PracticeStart.svelte';
	import VocabRunner from './VocabRunner.svelte';
	import type { PracticeConfig } from './config';

	// Start screen -> runner -> result, for one set or for all sets of a subject.
	type Props = { sets: StudySet[]; title: string; backHref: string };
	let { sets, title, backHref }: Props = $props();

	// ?mode=learn or ?mode=test comes from the practice menu on the set page.
	const initialMode = page.url.searchParams.get('mode') === 'test' ? 'test' : 'learn';

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

	function restart(next: PracticeConfig | null) {
		config = next;
		run++;
		if (!next) void refreshResults();
	}
</script>

<div class="min-h-dvh bg-bg px-4 py-6 sm:px-8 sm:py-10">
	{#if !ready}
		<p class="py-16 text-center text-text-muted" role="status">Laden…</p>
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