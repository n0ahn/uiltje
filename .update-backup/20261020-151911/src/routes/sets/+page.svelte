<script lang="ts">
	import { onMount } from 'svelte';
	import PracticeMenu from '#lib/components/practice/PracticeMenu.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import Owl from '#lib/components/ui/Owl.svelte';
	import { getStorage } from '#lib/storage/index.js';
	import type { SetSummary } from '#lib/storage/adapter.js';

	const storage = getStorage();
	let sets = $state<SetSummary[] | null>(null);

	async function load() {
		sets = await storage.listSets();
	}
	onMount(() => void load());
</script>

<svelte:head><title>Mijn sets · Uiltje</title></svelte:head>

<div class="mb-6 flex flex-wrap items-center gap-3">
	<h1 class="min-w-0 flex-1 font-heading text-3xl font-semibold">Mijn sets</h1>
	<Button href="/sets/new?import=1" variant="secondary"><Icon name="import" size={18} /> Importeren</Button>
	<Button href="/sets/new"><Icon name="plus" size={18} /> Nieuwe set</Button>
</div>

{#if sets === null}
	<p class="py-16 text-center text-text-muted" role="status">Sets laden…</p>
{:else if sets.length === 0}
	<div class="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
		<Owl pose="idle" size={96} />
		<h2 class="font-heading text-2xl font-semibold">Nog geen sets</h2>
		<p class="text-text-muted">Maak je eerste set met een sjabloon, of importeer er een als JSON.</p>
		<Button href="/sets/new">Eerste set maken</Button>
	</div>
{:else}
	<ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
		{#each sets as set (set.id)}
			<li>
				<Card class="relative flex h-full flex-col gap-3 hover:bg-surface-2">
					<div class="min-w-0">
						<h2 class="truncate font-heading text-lg font-semibold">
							<!-- The whole card is clickable through this link. -->
							<a href="/sets/{set.id}" class="after:absolute after:inset-0 after:content-['']">{set.title}</a>
						</h2>
						<p class="truncate text-sm text-text-muted">
							{set.subject}{set.folder ? ` · ${set.folder}` : ''}
						</p>
						<p class="mt-1 text-sm text-text-muted">{set.listCount} {set.listCount === 1 ? 'lijst' : 'lijsten'} · {set.rowCount} {set.rowCount === 1 ? 'rij' : 'rijen'}</p>
					</div>
					<div class="relative z-10 mt-auto flex flex-wrap gap-2">
						<PracticeMenu href="/sets/{set.id}/practice" size="sm" />
					</div>
				</Card>
			</li>
		{/each}
	</ul>
{/if}
