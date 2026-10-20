<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import PracticeScreen from '#lib/components/practice/PracticeScreen.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Owl from '#lib/components/ui/Owl.svelte';
	import PracticeSkeleton from '#lib/components/skeleton/PracticeSkeleton.svelte';
	import type { StudySet } from '#lib/schema/types.js';
	import { getStorage } from '#lib/storage/index.js';
	import { sameSubject, subjectSlug } from '#lib/utils/subject.js';

	let sets = $state<StudySet[] | null>(null);
	// SvelteKit has already decoded the route parameter.
	const subject = $derived(page.params.subject ?? '');
	const name = $derived(sets?.[0]?.subject.trim() || subject);

	onMount(async () => {
		const storage = getStorage();
		const summaries = (await storage.listSets()).filter((s) => sameSubject(s.subject, subject));
		const loaded = await Promise.all(summaries.map((s) => storage.getSet(s.id)));
		sets = loaded.filter((s): s is StudySet => s !== null);
	});
</script>

{#if sets === null}
	<div class="min-h-dvh bg-bg px-4 py-6 sm:px-8 sm:py-10">
		<PracticeSkeleton />
	</div>
{:else if sets.length === 0}
	<div class="min-h-dvh bg-bg px-4 py-6 sm:px-8 sm:py-10">
		<div class="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
			<Owl pose="sleepy" size={96} />
			<h1 class="font-heading text-2xl font-semibold">Geen sets voor dit vak</h1>
			<Button href="/vakken">Naar vakken</Button>
		</div>
	</div>
{:else}
	<PracticeScreen {sets} title={name} backHref="/vak/{subjectSlug(name)}" />
{/if}
