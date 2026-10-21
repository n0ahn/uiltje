<script lang="ts">
	import { onMount } from 'svelte';
	import { getSocial } from '../../social';
	import { periodStart } from '../../social/period';
	import type { LeaderRow } from '../../social/types';
	import Avatar from '../ui/Avatar.svelte';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Icon from '../ui/Icon.svelte';
	import Skeleton from '../ui/Skeleton.svelte';

	// Top 3 of the week among you and your friends. Guests see an invitation to log in instead.
	type Props = { signedIn: boolean };
	let { signedIn }: Props = $props();

	let rows = $state<LeaderRow[] | null>(null);
	let failed = $state(false);

	onMount(async () => {
		if (!signedIn) return;
		try {
			const all = await getSocial().leaderboard(periodStart('week'));
			rows = all.sort((a, b) => b.practiced - a.practiced || a.displayName.localeCompare(b.displayName, 'nl'));
		} catch {
			failed = true;
		}
	});

	const top = $derived((rows ?? []).filter((r) => r.practiced > 0).slice(0, 3));
</script>

<Card>
	<h3 class="flex items-center gap-2">
		<Icon name="trophy" size={20} class="text-wheat" /> Vrienden deze week
	</h3>
	{#if !signedIn}
		<p class="mt-3 text-sm text-text-muted">Log in om vrienden toe te voegen en samen te oefenen.</p>
		<Button href="/login" size="sm" class="mt-3">Inloggen</Button>
	{:else if failed}
		<p class="mt-3 text-sm text-text-muted">De ranglijst kon niet laden.</p>
		<a href="/leaderboard" class="mt-3 inline-block text-sm font-bold text-primary-text hover:underline">Probeer de ranglijst</a>
	{:else if rows === null}
		<ol class="mt-3 flex min-h-28 flex-col gap-3" role="status" aria-busy="true">
			<span class="sr-only">Laden…</span>
			{#each { length: 3 } as _, i (i)}
				<li class="flex items-center gap-3">
					<Skeleton class="size-6 shrink-0 rounded-full!" />
					<Skeleton class="size-7.5 shrink-0 rounded-full!" />
					<Skeleton class="h-4 min-w-0 flex-1" />
				</li>
			{/each}
		</ol>
	{:else}
		{#if top.length === 0}
			<p class="mt-3 min-h-16 text-sm text-text-muted">
				{rows.length > 1 ? 'Deze week heeft nog niemand geoefend. Begin maar!' : 'Je hebt nog geen vrienden. Voeg er een toe om te vergelijken.'}
			</p>
		{:else}
			<ol class="mt-3 flex flex-col gap-2">
				{#each top as row, i (row.id)}
					<li class="flex items-center gap-3">
						<span class="grid size-6 place-items-center rounded-full bg-surface-2 font-heading text-sm font-semibold">{i + 1}</span>
						<Avatar name={row.displayName} src={row.avatarUrl} size={30} />
						<span class="min-w-0 flex-1 truncate font-semibold">{row.isMe ? 'Jij' : row.displayName}</span>
						<span class="text-sm text-text-muted">{row.practiced} antwoorden</span>
					</li>
				{/each}
			</ol>
		{/if}
		<a href={rows.length > 1 ? '/leaderboard' : '/friends'} class="mt-3 inline-block text-sm font-bold text-primary-text hover:underline">
			{rows.length > 1 ? 'Hele ranglijst' : 'Vrienden toevoegen'}
		</a>
	{/if}
</Card>
