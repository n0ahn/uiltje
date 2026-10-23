<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import Owl from '#lib/components/ui/Owl.svelte';
	import CardGridSkeleton from '#lib/components/skeleton/CardGridSkeleton.svelte';
	import { accentStyle } from '#lib/components/ui/accent.js';
	import { getStorage } from '#lib/storage/index.js';
	import type { SetSummary } from '#lib/storage/adapter.js';
	import { sameSubject, subjectAccent, subjectSlug } from '#lib/utils/subject.js';

	type Subject = { name: string; sets: number; lists: number; rows: number };

	let subjects = $state<Subject[] | null>(null);

	function group(sets: SetSummary[]): Subject[] {
		const out: Subject[] = [];
		for (const set of sets) {
			const found = out.find((s) => sameSubject(s.name, set.subject));
			if (found) {
				found.sets++;
				found.lists += set.listCount;
				found.rows += set.rowCount;
			} else out.push({ name: set.subject.trim(), sets: 1, lists: set.listCount, rows: set.rowCount });
		}
		return out.sort((a, b) => a.name.localeCompare(b.name, 'nl'));
	}

	onMount(async () => {
		subjects = group(await getStorage().listSets());
	});
</script>

<svelte:head><title>Vakken · Uiltje</title></svelte:head>

<h1 class="mb-6 font-heading text-3xl font-semibold">Vakken</h1>

{#if subjects === null}
	<CardGridSkeleton variant="subject" class="min-h-40" />
{:else if subjects.length === 0}
	<div class="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
		<Owl pose="idle" size={96} />
		<h2 class="font-heading text-2xl font-semibold">Nog geen vakken</h2>
		<p class="text-text-muted">Een vak ontstaat vanzelf zodra je een set maakt. Je kiest het vak bij de set.</p>
		<Button href="/sets/new">Eerste set maken</Button>
	</div>
{:else}
	<ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
		{#each subjects as subject (subject.name.toLowerCase())}
			<li>
				<Card href="/vak/{subjectSlug(subject.name)}" accent={subjectAccent(subject.name)} class="flex min-h-40 flex-col">
					<span
						class="grid size-11 shrink-0 place-items-center rounded-tile bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-(--accent)"
						style={accentStyle(subjectAccent(subject.name))}
					>
						<Icon name="book" size={24} />
					</span>
					<h2 class="mt-3 font-heading text-xl font-semibold">{subject.name}</h2>
					<p class="text-sm text-text-muted">
						{subject.sets} {subject.sets === 1 ? 'set' : 'sets'} · {subject.lists} {subject.lists === 1 ? 'rijtje' : 'rijtjes'} · {subject.rows} {subject.rows === 1 ? 'vorm' : 'vormen'}
					</p>
				</Card>
			</li>
		{/each}
	</ul>
{/if}
