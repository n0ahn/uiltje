<script lang="ts">
	import { onMount } from 'svelte';
	import { getSocial } from '../../social';
	import type { ProfileSet, ProfileView } from '../../social/types';
	import { sessionsThisWeek, streakDays } from '../../stats/stats';
	import type { SessionLog } from '../../storage/adapter';
	import ProfileSkeleton from '../skeleton/ProfileSkeleton.svelte';
	import StatCard from '../stats/StatCard.svelte';
	import Avatar from '../ui/Avatar.svelte';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Chip from '../ui/Chip.svelte';
	import Icon from '../ui/Icon.svelte';
	import Owl from '../ui/Owl.svelte';
	import Segmented from '../ui/Segmented.svelte';

	// A profile: photo, name, personal statistics and the sets that person shows. Your own profile also lists your
	// private sets; a friend's profile only has their public ones.
	type Props = { username: string };
	let { username }: Props = $props();

	let view = $state<ProfileView | null>(null);
	let phase = $state<'loading' | 'ready' | 'missing' | 'failed'>('loading');
	let filter = $state<'all' | 'public' | 'private'>('all');

	onMount(async () => {
		try {
			view = await getSocial().getProfile(username);
			phase = view ? 'ready' : 'missing';
		} catch {
			phase = 'failed';
		}
	});

	const FILTERS = [
		{ id: 'all', name: 'Alles' },
		{ id: 'public', name: 'Openbaar' },
		{ id: 'private', name: 'Privé' }
	] as const;

	const since = new Intl.DateTimeFormat('nl-NL', { month: 'long', year: 'numeric' });
	const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

	// The server sends session end times; the streak and the week count are worked out here, in the viewer's time zone.
	const logs = $derived.by<SessionLog[]>(() =>
		(view?.activity ?? []).map((t, i) => ({ id: String(i), mode: 'learn', setIds: [], startedAt: t, endedAt: t, total: 1, correct: 1 }))
	);
	const stats = $derived(view?.stats ?? null);
	const streak = $derived(streakDays(logs, Date.now()));
	const thisWeek = $derived(sessionsThisWeek(logs, Date.now()));
	const accuracy = $derived(stats && stats.answers > 0 ? Math.round((stats.correct / stats.answers) * 100) : null);
	const sets = $derived((view?.sets ?? []).filter((s) => filter === 'all' || (filter === 'public') === s.isPublic));
	const firstName = $derived(view?.displayName.split(' ')[0] ?? '');

	const setHref = (s: ProfileSet) => (view?.isSelf ? `/sets/${s.id}` : `/openbaar/${s.id}`);
</script>

{#if phase === 'loading'}
	<ProfileSkeleton />
{:else if phase === 'missing' || phase === 'failed' || !view}
	<div class="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
		<Owl pose="sleepy" size={96} />
		<h1 class="font-heading text-2xl font-semibold">{phase === 'failed' ? 'Laden lukt niet' : 'Dit profiel is niet te zien'}</h1>
		<p class="text-text-muted">
			{phase === 'failed'
				? 'Controleer je internetverbinding en probeer het opnieuw. Heb je 003_profiles.sql al uitgevoerd?'
				: 'Je ziet alleen het profiel van je vrienden. Misschien bestaat deze gebruiker niet, of zijn jullie nog geen vrienden.'}
		</p>
		<Button href="/friends">Naar vrienden</Button>
	</div>
{:else}
	<div class="flex flex-col gap-5">
		<Card class="flex flex-col gap-4 sm:flex-row sm:items-center">
			<Avatar name={view.displayName} src={view.avatarUrl} size={112} />
			<div class="min-w-0 flex-1">
				<h1 class="truncate font-heading text-3xl font-semibold">{view.displayName}</h1>
				<p class="truncate text-text-muted">@{view.username} · lid sinds {since.format(view.memberSince)}</p>
				<div class="mt-2 flex flex-wrap gap-2">
					{#if view.isSelf}<Chip active>Dit ben jij</Chip>{:else}<Chip><Icon name="users" size={14} /> Vrienden</Chip>{/if}
					{#if stats && streak > 0}<Chip><Icon name="flame" size={14} class="text-flame" /> {plural(streak, 'dag', 'dagen')} op rij</Chip>{/if}
				</div>
			</div>
			{#if view.isSelf}
				<Button variant="secondary" href="/settings?tab=profiel"><Icon name="pencil" size={18} /> Profiel bewerken</Button>
			{/if}
		</Card>

		<section class="flex flex-col gap-3" aria-labelledby="stats-title">
			<h2 id="stats-title" class="font-heading text-xl font-semibold">Statistieken</h2>
			{#if stats}
				<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					<StatCard icon="check" label="Antwoorden" value={String(stats.answers)} note="Alles bij elkaar" />
					<StatCard icon="chart" label="Nauwkeurigheid" value={accuracy === null ? '–' : `${accuracy}%`} note="Goed zonder hint" />
					<StatCard icon="flame" iconClass="text-flame" label="Reeks" value={String(streak)} note={streak === 1 ? 'dag op rij' : 'dagen op rij'} />
					<StatCard icon="bulb" label="Onder de knie" value={String(stats.mastered)} note={stats.mastered === 1 ? 'onderdeel' : 'onderdelen'} />
					<StatCard icon="play" label="Deze week" value={String(thisWeek)} note={thisWeek === 1 ? 'oefenmoment' : 'oefenmomenten'} />
					<StatCard icon="trophy" label="Toetsen" value={String(stats.tests)} note="Gemaakt" />
				</div>
			{:else}
				<Card class="flex items-center gap-3">
					<Icon name="eye-off" size={22} class="shrink-0 text-text-muted" />
					<p class="text-text-muted">{firstName} houdt statistieken privé.</p>
				</Card>
			{/if}
		</section>

		<section class="flex flex-col gap-3" aria-labelledby="sets-title">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h2 id="sets-title" class="font-heading text-xl font-semibold">{view.isSelf ? 'Mijn sets' : 'Openbare sets'}</h2>
				{#if view.isSelf}
					<div class="w-full max-w-xs"><Segmented legend="Sets filteren" hideLegend options={FILTERS} bind:value={filter} /></div>
				{/if}
			</div>

			{#if sets.length === 0}
				<Card class="flex flex-col items-center gap-2 py-8 text-center">
					<Owl pose="idle" size={72} />
					<p class="text-text-muted">
						{#if view.isSelf}
							{view.sets.length === 0 ? 'Je hebt nog geen sets.' : 'Geen sets in deze selectie.'}
						{:else}
							{firstName} heeft nog geen openbare sets.
						{/if}
					</p>
				</Card>
			{:else}
				<ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{#each sets as s (s.id)}
						<li>
							<Card class="relative flex h-full flex-col gap-1 hover:bg-surface-2">
								<h3 class="truncate font-heading text-lg font-semibold">
									<a href={setHref(s)} class="after:absolute after:inset-0 after:content-['']">{s.title}</a>
								</h3>
								<p class="truncate text-sm text-text-muted">{s.subject}</p>
								<p class="text-sm text-text-muted">{plural(s.listCount, 'lijst', 'lijsten')} · {plural(s.rowCount, 'onderdeel', 'onderdelen')}</p>
								{#if view.isSelf}
									<div class="mt-2">
										<Chip active={s.isPublic}><Icon name={s.isPublic ? 'eye' : 'eye-off'} size={14} /> {s.isPublic ? 'Openbaar' : 'Privé'}</Chip>
									</div>
								{/if}
							</Card>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
{/if}
