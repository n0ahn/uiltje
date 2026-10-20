<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';
	import LeaderboardSkeleton from '#lib/components/skeleton/LeaderboardSkeleton.svelte';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import Owl from '#lib/components/ui/Owl.svelte';
	import Segmented from '#lib/components/ui/Segmented.svelte';
	import { getSocial } from '#lib/social/index.js';
	import { accuracyOf, periodStart, type Period } from '#lib/social/period.js';
	import type { LeaderRow } from '#lib/social/types.js';

	let { data }: PageProps = $props();

	type Metric = 'practiced' | 'accuracy';
	/** Accuracy only counts from this many answers, so one lucky answer does not win. */
	const MIN_ANSWERS = 10;

	let period = $state<Period>('week');
	let metric = $state<Metric>('practiced');
	let rows = $state<LeaderRow[] | null>(null);
	let failed = $state(false);
	let run = 0;

	const periodOptions = [
		{ id: 'week' as const, name: 'Deze week' },
		{ id: 'month' as const, name: 'Deze maand' }
	];
	const metricOptions = [
		{ id: 'practiced' as const, name: 'Meest geoefend' },
		{ id: 'accuracy' as const, name: 'Hoogste nauwkeurigheid' }
	];

	async function load() {
		const mine = ++run;
		failed = false;
		rows = null;
		try {
			const result = await getSocial().leaderboard(periodStart(period));
			if (mine === run) rows = result;
		} catch {
			if (mine === run) failed = true;
		}
	}
	onMount(() => {
		if (data.user) void load();
	});

	const ranked = $derived.by(() => {
		if (!rows) return [];
		const score = (r: LeaderRow) => (metric === 'practiced' ? r.practiced : r.practiced >= MIN_ANSWERS ? (accuracyOf(r) ?? 0) : -1);
		return [...rows].sort((a, b) => score(b) - score(a) || b.practiced - a.practiced || a.displayName.localeCompare(b.displayName, 'nl'));
	});
	const nobodyPracticed = $derived(rows !== null && rows.every((r) => r.practiced === 0));

	const percent = (r: LeaderRow) => {
		const a = accuracyOf(r);
		return a === null ? '–' : `${Math.round(a * 100)}%`;
	};
	function value(r: LeaderRow): string {
		if (metric === 'practiced') return `${r.practiced} ${r.practiced === 1 ? 'antwoord' : 'antwoorden'}`;
		return r.practiced >= MIN_ANSWERS ? percent(r) : `nog ${MIN_ANSWERS - r.practiced} nodig`;
	}
	function detail(r: LeaderRow): string {
		return metric === 'practiced' ? `${percent(r)} goed` : `${r.practiced} ${r.practiced === 1 ? 'antwoord' : 'antwoorden'}`;
	}

	// Podium: second, first, third; the first stands tallest.
	const podium = $derived(
		[1, 0, 2]
			.map((i) => ({ row: ranked[i], place: i + 1 }))
			.filter((p): p is { row: LeaderRow; place: number } => !!p.row && (metric === 'practiced' ? p.row.practiced > 0 : p.row.practiced >= MIN_ANSWERS))
	);
	const heights: Record<number, string> = { 1: 'min-h-36', 2: 'min-h-28', 3: 'min-h-24' };
</script>

<svelte:head><title>Ranglijst · Uiltje</title></svelte:head>

<div class="flex flex-col gap-5">
	<div class="flex flex-wrap items-center gap-3">
		<div class="min-w-0 flex-1">
			<h1 class="font-heading text-3xl font-semibold">Ranglijst</h1>
			<p class="text-text-muted">Jij en je vrienden. Alleen aantallen, nooit je sets of antwoorden.</p>
		</div>
		<Button href="/friends" variant="secondary"><Icon name="users" size={18} /> Vrienden</Button>
	</div>

	{#if !data.user}
		<Card class="mx-auto flex max-w-lg flex-col items-center gap-3 py-10 text-center">
			<Owl pose="idle" size={96} />
			<h2 class="font-heading text-2xl font-semibold">Log in voor de ranglijst</h2>
			<p class="text-text-muted">Met een account kun je vrienden toevoegen en zien wie er het meest oefent.</p>
			<Button href="/login">Inloggen</Button>
		</Card>
	{:else}
		<div class="grid max-w-3xl gap-3 sm:grid-cols-2">
			<Segmented legend="Periode" hideLegend options={periodOptions} bind:value={period} onchange={() => void load()} />
			<Segmented legend="Meten op" hideLegend options={metricOptions} bind:value={metric} />
		</div>

		{#if failed}
			<Card class="flex flex-col items-start gap-3">
				<p>De ranglijst laden lukt niet. Controleer je internetverbinding en probeer het opnieuw. Heb je <code>002_social.sql</code> al uitgevoerd?</p>
				<Button variant="secondary" onclick={load}>Opnieuw proberen</Button>
			</Card>
		{:else if rows === null}
			<LeaderboardSkeleton />
		{:else}
			{#if rows.length === 1}
				<Card class="flex flex-col items-center gap-2 py-6 text-center">
					<Owl pose="idle" size={80} />
					<p class="text-text-muted">Je staat hier nog alleen. Voeg een vriend toe om te vergelijken.</p>
					<Button href="/friends"><Icon name="user-plus" size={18} /> Vrienden toevoegen</Button>
				</Card>
			{/if}

			{#if podium.length > 0}
				<ol class="grid max-w-3xl grid-cols-3 items-end gap-3 sm:gap-5" aria-label="Top 3">
					{#each podium as { row, place } (row.id)}
						<li
							class={[
								'flex flex-col items-center gap-1 rounded-card border-2 p-3 text-center',
								heights[place],
								row.isMe ? 'border-primary bg-primary-soft' : 'border-border bg-surface'
							]}
						>
							{#if place === 1}<Icon name="trophy" size={22} class="text-wheat" />{:else}<span class="font-heading font-semibold text-text-muted">{place}</span>{/if}
							<Avatar name={row.displayName} src={row.avatarUrl} size={place === 1 ? 56 : 44} />
							<p class="w-full truncate font-semibold">{row.isMe ? 'Jij' : row.displayName}</p>
							<p class="text-sm font-semibold">{value(row)}</p>
						</li>
					{/each}
				</ol>
			{/if}

			<Card class="max-w-3xl">
				<ol class="flex flex-col gap-1">
					{#each ranked as row, i (row.id)}
						<li class={['relative flex items-center gap-3 rounded-tile px-2 py-2 hover:bg-surface-2', row.isMe && 'bg-primary-soft']}>
							<span class="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 font-heading text-sm font-semibold">{i + 1}</span>
							<Avatar name={row.displayName} src={row.avatarUrl} size={40} />
							<div class="min-w-0 flex-1">
								<p class="truncate font-semibold">
									<a href={row.isMe ? '/profile' : `/u/${row.username}`} class="after:absolute after:inset-0 after:content-['']">{row.displayName}{row.isMe ? ' (jij)' : ''}</a>
								</p>
								<p class="truncate text-sm text-text-muted">@{row.username} · {detail(row)}</p>
							</div>
							<span class="shrink-0 text-right font-semibold">{value(row)}</span>
						</li>
					{/each}
				</ol>
				{#if metric === 'accuracy'}
					<p class="mt-3 text-sm text-text-muted">Nauwkeurigheid telt vanaf {MIN_ANSWERS} antwoorden in deze periode.</p>
				{:else if nobodyPracticed}
					<p class="mt-3 text-sm text-text-muted">Nog niemand heeft geoefend in deze periode. Begin maar!</p>
				{/if}
			</Card>
		{/if}
	{/if}
</div>
