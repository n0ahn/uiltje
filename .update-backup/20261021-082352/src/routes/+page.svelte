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
	import CardSkeleton from '#lib/components/skeleton/CardSkeleton.svelte';
	import RecentSetsSkeleton from '#lib/components/skeleton/RecentSetsSkeleton.svelte';
	import { overview } from '#lib/state/overview.svelte.js';
	import { greetingFor } from '#lib/utils/greeting.js';
	import { displayName, username as usernameOf } from '#lib/utils/user.js';

	let { data }: PageProps = $props();

	// The greeting depends on the browser clock, so it is set after mount (avoids a server/client mismatch).
	let hour = $state<number | null>(null);
	onMount(() => {
		hour = new Date().getHours();
		void overview.load(); // shows the last result at once and refreshes it
	});

	const dash = $derived(overview.data);
	const emptyWeek = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((day) => ({ day, amount: 0 }));

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
		<HeroCard recent={dash?.recent ?? null} loading={dash === null && !overview.failed} />

		<section aria-labelledby="vakken-title">
			<div class="mb-3 flex items-baseline justify-between">
				<h2 id="vakken-title">Jouw vakken</h2>
				<a href="/vakken" class="text-sm font-bold text-primary-text hover:underline">Alles bekijken</a>
			</div>
			<div class="grid grid-cols-2 gap-4 md:grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))]">
				{#if dash === null && !overview.failed}
					{#each { length: 3 } as _, i (i)}
						<CardSkeleton variant="subject" class="min-h-44" />
					{/each}
				{:else}
					{#each dash?.subjects ?? [] as subject (subject.slug)}
						<SubjectCard {subject} />
					{/each}
				{/if}
				<a
					href="/sets/new"
					class="grid min-h-44 place-items-center rounded-card border-2 border-dashed border-border text-center font-heading font-semibold text-text-muted transition-colors duration-150 hover:border-primary hover:text-primary-text"
				>
					<span class="flex flex-col items-center gap-1.5"><Icon name="plus" size={26} /> Nieuw vak</span>
				</a>
			</div>
		</section>

		<section aria-labelledby="recent-title">
			<h2 id="recent-title" class="mb-3">Recente sets</h2>
			{#if dash === null}
				{#if !overview.failed}<RecentSetsSkeleton />{:else}<div class="min-h-24"></div>{/if}
			{:else if dash.recentSets.length === 0}
				<p class="text-text-muted">Je sets verschijnen hier zodra je er een maakt.</p>
			{:else}
				<RecentSets sets={dash.recentSets} />
			{/if}
		</section>
	</div>

	<aside class="relative flex min-w-0 flex-col gap-6 md:grid md:grid-cols-2 xl:flex xl:flex-col" aria-label="Overzicht">
		<StreakCard loading={dash === null && !overview.failed} days={dash?.streak ?? 0} week={dash?.week ?? emptyWeek} />
		<FriendsMini signedIn={!!data.user} />
		<div class="md:col-span-2 xl:col-span-1"><QuickActions /></div>
		<Deco kind="sprig" size={44} class="absolute -right-2 -bottom-10 hidden xl:block" />
	</aside>
</div>