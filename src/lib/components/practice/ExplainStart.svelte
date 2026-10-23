<script lang="ts">
	import type { StudySet } from '../../schema/types';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Icon from '../ui/Icon.svelte';
	import Segmented from '../ui/Segmented.svelte';
	import { page } from '$app/state';
	import { auth } from '../../state/auth.svelte';
	import { settings } from '../../state/settings.svelte';
	import { STRICTNESS_OPTIONS, type ExplainConfig, type PracticeConfig } from './config';

	// Start screen of "Uitleggen": which lists of begrippen, how many terms.
	type Props = { sets: StudySet[]; title: string; backHref: string; onstart: (config: ExplainConfig) => void };
	let { sets, title, backHref, onstart }: Props = $props();

	const conceptLists = (set: StudySet) => set.lists.filter((l) => l.kind === 'concept' && l.rows.length > 0);
	// svelte-ignore state_referenced_locally
	let selection = $state<Record<string, string[]>>(Object.fromEntries(sets.map((set) => [set.id, conceptLists(set).map((l) => l.id)])));
	let count = $state<number | null>(10);
	let strictness = $state<PracticeConfig['strictness']>(settings.value.practice.strictness);

	const COUNT_OPTIONS = [
		{ id: 5, name: '5 begrippen' },
		{ id: 10, name: '10 begrippen' },
		{ id: 0, name: 'Alles' }
	];
	// Segmented needs a plain id: 0 means "all".
	let countChoice = $state(10);
	$effect(() => {
		count = countChoice === 0 ? null : countChoice;
	});

	const selected = $derived(Object.values(selection).reduce((n, ids) => n + ids.length, 0));
	const hasLists = $derived(sets.some((set) => conceptLists(set).length > 0));

	function toggle(setId: string, listId: string) {
		const current = selection[setId] ?? [];
		selection[setId] = current.includes(listId) ? current.filter((id) => id !== listId) : [...current, listId];
	}
</script>

<svelte:head><title>Uitleggen · {title} · Uiltje</title></svelte:head>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-4">
	<div class="flex items-center gap-3">
		<Button href={backHref} variant="ghost" size="sm" iconOnly aria-label="Terug"><Icon name="arrow-left" size={20} /></Button>
		<div class="min-w-0 flex-1">
			<h1 class="truncate font-heading text-2xl font-semibold">Uitleggen</h1>
			<p class="truncate text-text-muted">{title}</p>
		</div>
	</div>

	<Card class="flex flex-col gap-5 sm:p-8">
		<p class="text-text-muted">Je krijgt een stijlfiguur of regel en legt in je eigen woorden uit wat het is. Daarna zie je de uitleg uit de syllabus. Aan het eind kijkt de AI je antwoorden na; je beoordeelt jezelf dus niet. Ben je het er niet mee eens, dan kun je bezwaar indienen. Dit telt niet mee voor je voortgang.</p>

		{#if !auth.user}
			<p class="rounded-tile bg-surface-2 p-3 font-semibold" role="status">Log in om Uitleggen te gebruiken: de AI moet je antwoorden kunnen nakijken.</p>
			<div><Button href="/login?next={encodeURIComponent(page.url.pathname + page.url.search)}" size="lg"><Icon name="log-in" size={20} /> Inloggen</Button></div>
		{:else if !hasLists}
			<p class="rounded-tile bg-rose-soft p-3 font-semibold" role="alert">Deze set heeft geen lijst met begrippen. Maak er een met het sjabloon Stijlfiguren of Grammatica.</p>
		{:else}
			<fieldset class="flex flex-col gap-2">
				<legend class="mb-1 text-sm font-semibold text-text-muted">Welke lijsten?</legend>
				{#each sets as set (set.id)}
					{#if sets.length > 1}<p class="font-heading font-semibold">{set.title}</p>{/if}
					<ul class="flex flex-wrap gap-2">
						{#each conceptLists(set) as list (list.id)}
							{@const on = selection[set.id]?.includes(list.id) ?? false}
							<li>
								<label class={['inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-3 text-sm font-semibold has-focus-visible:outline-3 has-focus-visible:outline-primary/50', on ? 'border-primary bg-primary-soft text-primary-text' : 'border-border bg-surface text-text-muted']}>
									<input type="checkbox" class="sr-only" checked={on} onchange={() => toggle(set.id, list.id)} />
									{list.title.trim() || 'Naamloze lijst'} <span class="font-normal">({list.rows.length})</span>
								</label>
							</li>
						{/each}
					</ul>
				{/each}
			</fieldset>

			<Segmented legend="Hoeveel?" options={COUNT_OPTIONS} bind:value={countChoice} />
			<Segmented legend="Hoe streng kijkt de AI na?" stack options={STRICTNESS_OPTIONS} bind:value={strictness} />

			<div>
				<Button size="lg" class="min-w-44" disabled={selected === 0} onclick={() => onstart({ selection: { ...selection }, count, strictness })}><Icon name="play" size={20} /> Start</Button>
			</div>
		{/if}
	</Card>
</div>
