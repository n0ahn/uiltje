<script lang="ts">
	import { onMount } from 'svelte';
	import ActivityChart from '#lib/components/stats/ActivityChart.svelte';
	import StatCard from '#lib/components/stats/StatCard.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Chip from '#lib/components/ui/Chip.svelte';
	import Owl from '#lib/components/ui/Owl.svelte';
	import ProgressBar from '#lib/components/ui/ProgressBar.svelte';
	import Segmented from '#lib/components/ui/Segmented.svelte';
	import { loadStats, type LoadedStats } from '#lib/stats/library.js';
	import {
		accuracy,
		dailyActivity,
		hardestRows,
		ratio,
		sessionsForSets,
		sessionsThisWeek,
		setMastery,
		streakDays,
		type Mastery
	} from '#lib/stats/stats.js';
	import { settings } from '#lib/state/settings.svelte.js';
	import { getStorage } from '#lib/storage/index.js';
	import type { TestRecord } from '#lib/storage/adapter.js';
	import { sameSubject, subjectAccent } from '#lib/utils/subject.js';

	let loaded = $state<LoadedStats | null>(null);
	let tests = $state<TestRecord[]>([]);
	let failed = $state(false);
	let subject = $state('*');
	let span = $state<14 | 28>(14);
	const now = Date.now();

	async function load() {
		failed = false;
		try {
			const storage = getStorage();
			[loaded, tests] = await Promise.all([loadStats(storage, Date.now()), storage.listTestResults(50)]);
		} catch {
			failed = true;
		}
	}
	onMount(() => {
		void settings.load();
		void load();
	});

	const subjects = $derived.by(() => {
		const names: string[] = [];
		for (const { set } of loaded?.library ?? []) if (!names.some((n) => sameSubject(n, set.subject))) names.push(set.subject.trim());
		return names.sort((a, b) => a.localeCompare(b, 'nl'));
	});
	// A subject that disappeared (set deleted) falls back to "all".
	const active = $derived(subject === '*' || subjects.some((n) => sameSubject(n, subject)) ? subject : '*');
	const filterOptions = $derived([{ id: '*', name: 'Alles' }, ...subjects.map((name) => ({ id: name, name }))]);
	const spanOptions = [
		{ id: 14 as const, name: '2 weken' },
		{ id: 28 as const, name: '4 weken' }
	];

	const view = $derived.by(() => {
		if (!loaded) return null;
		const library = active === '*' ? loaded.library : loaded.library.filter((i) => sameSubject(i.set.subject, active));
		const ids = new Set(library.map((i) => i.set.id));
		const sessions = active === '*' ? loaded.sessions : sessionsForSets(loaded.sessions, ids);
		const mastery = library.reduce<Mastery>(
			(sum, item) => {
				const m = setMastery(item);
				return { total: sum.total + m.total, mastered: sum.mastered + m.mastered };
			},
			{ total: 0, mastered: 0 }
		);
		return {
			library,
			mastery,
			streak: streakDays(sessions, now),
			week: sessionsThisWeek(sessions, now),
			accuracy: accuracy(library),
			days: dailyActivity(sessions, span, now),
			hard: hardestRows(library, 8),
			sets: library.map((item) => ({ item, mastery: setMastery(item) })).sort((a, b) => ratio(a.mastery) - ratio(b.mastery)),
			tests: tests.filter((t) => active === '*' || t.setIds.some((id) => ids.has(id))).slice(0, 6)
		};
	});

	const percent = (value: number) => `${Math.round(value * 100)}%`;
	const dateFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' });
	const gradeFormat = new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
</script>

<svelte:head><title>Statistieken · Uiltje</title></svelte:head>

<div class="flex flex-col gap-6">
	<div>
		<h1 class="font-heading text-3xl font-semibold">Statistieken</h1>
		<p class="text-text-muted">Zo ver ben je met je onderdelen. Een onderdeel is onder de knie als je het twee keer achter elkaar goed hebt, zonder hint.</p>
	</div>

	{#if failed}
		<Card class="flex flex-col items-start gap-3">
			<p>Je statistieken laden lukt niet. Controleer je internetverbinding en probeer het opnieuw.</p>
			<Button variant="secondary" onclick={load}>Opnieuw proberen</Button>
		</Card>
	{:else if view === null}
		<p class="py-16 text-center text-text-muted" role="status">Statistieken laden…</p>
	{:else if loaded && loaded.library.length === 0}
		<div class="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
			<Owl pose="idle" size={96} />
			<h2 class="font-heading text-2xl font-semibold">Nog niets te zien</h2>
			<p class="text-text-muted">Maak een set en oefen een blokje, dan verschijnt je voortgang hier.</p>
			<Button href="/sets/new">Eerste set maken</Button>
		</div>
	{:else}
		{#if subjects.length > 1}
			<div class="max-w-xl"><Segmented legend="Vak" hideLegend options={filterOptions} bind:value={subject} /></div>
		{/if}

		<div class="grid grid-cols-2 gap-4 xl:grid-cols-4">
			<StatCard label="Streak" icon="flame" iconClass="text-flame" value="{view.streak} {view.streak === 1 ? 'dag' : 'dagen'}" note={view.streak === 0 ? 'Oefen vandaag om te beginnen' : 'Dagen achter elkaar geoefend'} />
			<StatCard
				label="Onder de knie"
				icon="check"
				value="{view.mastery.mastered} van {view.mastery.total}"
				note={view.mastery.total === 0 ? '' : `${percent(ratio(view.mastery))} van je onderdelen`}
			/>
			<StatCard label="Sessies deze week" icon="play" value={String(view.week)} note="Sinds maandag" />
			<StatCard label="Nauwkeurigheid" icon="chart" value={view.accuracy === null ? '–' : percent(view.accuracy)} note="Goed zonder hint, van alle antwoorden" />
		</div>

		<Card class="flex flex-col gap-4">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h2 class="font-heading text-lg font-semibold">Geoefend per dag</h2>
				<div class="w-56"><Segmented legend="Periode" hideLegend options={spanOptions} bind:value={span} /></div>
			</div>
			<ActivityChart days={view.days} />
			<p class="text-sm text-text-muted">Het aantal antwoorden dat je per dag gaf.</p>
		</Card>

		<div class="grid gap-6 lg:grid-cols-2 lg:items-start">
			<Card class="flex flex-col gap-4">
				<h2 class="font-heading text-lg font-semibold">Moeilijkste onderdelen</h2>
				{#if view.hard.length === 0}
					<p class="text-text-muted">Nog geen fouten die blijven hangen. Goed bezig.</p>
				{:else}
					{@const most = view.hard[0]?.wrong ?? 1}
					<ul class="flex flex-col gap-3">
						{#each view.hard as row (row.key)}
							<li>
								<a href="/sets/{row.setId}" class="block rounded-tile p-1 hover:bg-surface-2">
									<div class="flex items-baseline justify-between gap-3">
										<span class="min-w-0 truncate font-semibold">{row.prompt} <span class="text-text-muted">→</span> {row.answer}</span>
										<span class="shrink-0 text-sm font-semibold text-text-muted">{row.wrong}× fout</span>
									</div>
									<p class="truncate text-xs text-text-muted">{row.listTitle} · {row.setTitle}</p>
									<ProgressBar value={row.wrong / most} accent="primary" label="Aantal fouten" class="mt-1.5 h-1.5!" />
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</Card>

			<Card class="flex flex-col gap-4">
				<h2 class="font-heading text-lg font-semibold">Toetsen</h2>
				{#if view.tests.length === 0}
					<p class="text-text-muted">Je laatste toetsen staan hier zodra je er een hebt gemaakt.</p>
				{:else}
					<ul class="flex flex-col divide-y divide-border">
						{#each view.tests as test (test.id)}
							<li class="flex items-center gap-3 py-2.5">
								<div class="min-w-0 flex-1">
									<p class="truncate font-semibold">{test.title}</p>
									<p class="text-xs text-text-muted">{dateFormat.format(test.takenAt)} · {test.correct} van {test.total} goed</p>
								</div>
								{#if settings.value.test.showGrade}
									<span class="font-heading text-lg font-semibold">{gradeFormat.format(test.grade)}</span>
								{:else}
									<span class="font-heading text-lg font-semibold">{percent(test.score)}</span>
								{/if}
								<Chip>{test.passed ? 'Geslaagd' : 'Nog niet'}</Chip>
							</li>
						{/each}
					</ul>
				{/if}
			</Card>
		</div>

		<Card class="flex flex-col gap-4">
			<h2 class="font-heading text-lg font-semibold">Voortgang per set</h2>
			<ul class="grid gap-x-8 gap-y-4 md:grid-cols-2">
				{#each view.sets as { item, mastery } (item.set.id)}
					<li>
						<a href="/sets/{item.set.id}" class="block rounded-tile p-1 hover:bg-surface-2">
							<div class="mb-1.5 flex items-baseline justify-between gap-3">
								<span class="min-w-0 truncate font-semibold">{item.set.title}</span>
								<span class="shrink-0 text-sm text-text-muted">{mastery.mastered} van {mastery.total}</span>
							</div>
							<ProgressBar value={ratio(mastery)} accent={subjectAccent(item.set.subject)} label="Voortgang {item.set.title}" />
						</a>
					</li>
				{/each}
			</ul>
		</Card>
	{/if}
</div>
