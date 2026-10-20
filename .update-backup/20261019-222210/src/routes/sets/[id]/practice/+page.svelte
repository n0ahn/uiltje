<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import PracticeScreen from '#lib/components/practice/PracticeScreen.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Owl from '#lib/components/ui/Owl.svelte';
	import type { StudySet } from '#lib/schema/types.js';
	import { getStorage } from '#lib/storage/index.js';

	let set = $state<StudySet | null>(null);
	let missing = $state(false);

	onMount(async () => {
		const found = await getStorage().getSet(page.params.id ?? '');
		if (found) set = found;
		else missing = true;
	});
</script>

{#if missing}
	<div class="min-h-dvh bg-bg px-4 py-6 sm:px-8 sm:py-10">
		<div class="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
			<Owl pose="sleepy" size={96} />
			<h1 class="font-heading text-2xl font-semibold">Deze set bestaat niet (meer)</h1>
			<Button href="/sets">Naar mijn sets</Button>
		</div>
	</div>
{:else if !set}
	<div class="min-h-dvh bg-bg px-4 py-6 sm:px-8 sm:py-10">
		<p class="py-16 text-center text-text-muted" role="status">Set laden…</p>
	</div>
{:else}
	<PracticeScreen sets={[set]} title={set.title} backHref="/sets/{set.id}" />
{/if}