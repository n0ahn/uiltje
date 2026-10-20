<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';
	import FriendsMini from '#lib/components/dashboard/FriendsMini.svelte';
	import HeroCard from '#lib/components/dashboard/HeroCard.svelte';
	import QuickActions from '#lib/components/dashboard/QuickActions.svelte';
	import RecentSets from '#lib/components/dashboard/RecentSets.svelte';
	import StreakCard from '#lib/components/dashboard/StreakCard.svelte';
	import SubjectCard from '#lib/components/dashboard/SubjectCard.svelte';
	import TopBar from '#lib/components/shell/TopBar.svelte';
	import Deco from '#lib/components/ui/Deco.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import { friendRanking, recentPractice, recentSets, streakDays, subjects, weekActivity } from '#lib/dashboard/sample.js';
	import { greetingFor } from '#lib/utils/greeting.js';
	import { displayName, username as usernameOf } from '#lib/utils/user.js';

	let { data }: PageProps = $props();

	// The greeting depends on the browser clock, so it is set after mount (avoids a server/client mismatch).
	let hour = $state<number | null>(null);
	onMount(() => (hour = new Date().getHours()));

	const name = $derived(displayName(data.user));
	const username = $derived(usernameOf(data.user));
	const greeting = $derived(greetingFor(hour));
</script>

<svelte:head>
	<title>Uiltje</title>
</svelte:head>

<TopBar title="{greeting.text}, {name}" icon={greeting.icon} subtitle="Een beetje oefenen per dag brengt je ver." {name} {username} />

<div class="mt-6 grid gap-6 sm:mt-8 xl:grid-cols-[minmax(0,1fr)_320px]">
	<div class="flex min-w-0 flex-col gap-8">
		<HeroCard recent={recentPractice} />

		<section aria-labelledby="vakken-title">
			<div class="mb-3 flex items-baseline justify-between">
				<h2 id="vakken-title">Jouw vakken</h2>
				<a href="/vakken" class="text-sm font-bold text-primary-text hover:underline">Alles bekijken</a>
			</div>
			<div class="grid grid-cols-2 gap-4 md:grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))]">
				{#each subjects as subject (subject.slug)}
					<SubjectCard {subject} />
				{/each}
				<a
					href="/vak/nieuw"
					class="grid min-h-44 place-items-center rounded-card border-2 border-dashed border-border text-center font-heading font-semibold text-text-muted transition-colors duration-150 hover:border-primary hover:text-primary-text"
				>
					<span class="flex flex-col items-center gap-1.5"><Icon name="plus" size={26} /> Nieuw vak</span>
				</a>
			</div>
		</section>

		<section aria-labelledby="recent-title">
			<h2 id="recent-title" class="mb-3">Recente sets</h2>
			<RecentSets sets={recentSets} />
		</section>
	</div>

	<aside class="relative flex min-w-0 flex-col gap-6 md:grid md:grid-cols-2 xl:flex xl:flex-col" aria-label="Overzicht">
		<StreakCard days={streakDays} week={weekActivity} />
		<FriendsMini ranking={friendRanking} />
		<div class="md:col-span-2 xl:col-span-1"><QuickActions /></div>
		<Deco kind="sprig" size={44} class="absolute -right-2 -bottom-10 hidden xl:block" />
	</aside>
</div>