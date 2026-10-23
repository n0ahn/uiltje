<script lang="ts">
	import SocialTabs from '#lib/components/social/SocialTabs.svelte';
	import type { PageProps } from './$types';
	import { onMount } from 'svelte';
	import ChallengesSkeleton from '#lib/components/skeleton/ChallengesSkeleton.svelte';
	import PersonRow from '#lib/components/social/PersonRow.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Chip from '#lib/components/ui/Chip.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import Owl from '#lib/components/ui/Owl.svelte';
	import { formatGrade } from '#lib/engine/grading.js';
	import { getSocial } from '#lib/social/index.js';
	import type { Challenge, ChallengeScore } from '#lib/social/types.js';
	import { toasts } from '#lib/state/toast.svelte.js';
	import { StorageError } from '#lib/storage/adapter.js';

	// Challenges between you and your friends: invitations, running challenges with both best test scores, and the
	// ones that were declined. A score only exists after the friend accepted (made a copy) and took a test on it.
	let { data }: PageProps = $props();
	let challenges = $state<Challenge[] | null>(null);
	let failed = $state('');
	let busy = $state(false);

	async function load() {
		try {
			challenges = await getSocial().listChallenges();
			failed = '';
		} catch (e) {
			failed = e instanceof StorageError ? e.message : 'Laden lukt niet. Probeer het later opnieuw.';
			challenges ??= [];
		}
	}
	onMount(() => {
		if (data.user) void load();
	});

	const incoming = $derived((challenges ?? []).filter((c) => !c.iAmChallenger && c.status === 'pending'));
	const running = $derived((challenges ?? []).filter((c) => c.status === 'accepted' || (c.iAmChallenger && c.status === 'pending')));
	const declined = $derived((challenges ?? []).filter((c) => c.iAmChallenger && c.status === 'declined'));

	const percent = (s: ChallengeScore) => `${Math.round(s.score * 100)}%`;
	const scoreText = (s: ChallengeScore | null) => (s ? `${s.grade !== null ? `${formatGrade(s.grade)} · ` : ''}${percent(s)}` : 'nog geen toets');

	function verdict(c: Challenge): string {
		if (c.status !== 'accepted') return '';
		if (!c.me && !c.them) return 'Nog niemand heeft een toets gemaakt.';
		if (c.me && !c.them) return `${c.other.displayName} moet nog een toets maken.`;
		if (!c.me && c.them) return `${c.other.displayName} is je voor: maak een toets!`;
		if (c.me!.score > c.them!.score) return 'Jij staat voor!';
		if (c.me!.score < c.them!.score) return `${c.other.displayName} staat voor.`;
		return 'Gelijkspel.';
	}

	async function run(job: () => Promise<void>) {
		if (busy) return;
		busy = true;
		try {
			await job();
			await load();
		} catch (e) {
			toasts.show(e instanceof StorageError ? e.message : 'Er ging iets mis. Probeer het opnieuw.');
		} finally {
			busy = false;
		}
	}
	const decline = (c: Challenge) => run(() => getSocial().respondToChallenge(c.id, false));
	const remove = (c: Challenge) => run(() => getSocial().removeChallenge(c.id));
</script>

<svelte:head><title>Uitdagingen · Uiltje</title></svelte:head>

<div class="mx-auto flex max-w-3xl flex-col gap-6">
	<div class="flex items-center gap-4">
		<Owl pose="happy" size={64} />
		<div>
			<h1 class="font-heading text-3xl font-semibold">Uitdagingen</h1>
			<p class="text-text-muted">Daag een vriend uit op een set (via het ⋮-menu van de set) en kijk wie het hoogste cijfer haalt.</p>
		</div>
	</div>
	<SocialTabs />

	{#if !data.user}
		<Card class="flex flex-col items-center gap-3 py-10 text-center">
			<h2 class="font-heading text-2xl font-semibold">Log in om uitdagingen te zien</h2>
			<Button href="/login?next=/uitdagingen">Inloggen</Button>
		</Card>
	{:else if challenges === null}
		<ChallengesSkeleton />
	{:else}
		{#if failed}<p class="rounded-tile bg-surface-2 p-3 text-sm font-semibold text-rose-edge" role="alert">{failed}</p>{/if}

		{#if challenges.length === 0 && !failed}
			<Card class="flex flex-col items-center gap-3 py-10 text-center">
				<h2 class="font-heading text-2xl font-semibold">Nog geen uitdagingen</h2>
				<p class="text-text-muted">Open een set, kies ⋮ en dan "Vriend uitdagen…".</p>
				<Button href="/sets">Naar mijn sets</Button>
			</Card>
		{/if}

		{#if incoming.length > 0}
			<section class="flex flex-col gap-3" aria-labelledby="ch-in">
				<h2 id="ch-in" class="font-heading text-xl font-semibold">Voor jou</h2>
				{#each incoming as c (c.id)}
					<Card class="flex flex-col gap-3">
						<PersonRow person={c.other} note="daagt je uit" />
						<p class="font-heading text-lg font-semibold">{c.title} <span class="text-base font-normal text-text-muted">· {c.subject} · {c.rowCount} {c.rowCount === 1 ? 'rij' : 'rijen'}</span></p>
						<div class="flex flex-wrap gap-3">
							<Button href="/uitdaging/{c.id}" class="min-w-40"><Icon name="trophy" size={18} /> Bekijken en accepteren</Button>
							<Button variant="ghost" disabled={busy} onclick={() => decline(c)}>Afwijzen</Button>
						</div>
					</Card>
				{/each}
			</section>
		{/if}

		{#if running.length > 0}
			<section class="flex flex-col gap-3" aria-labelledby="ch-run">
				<h2 id="ch-run" class="font-heading text-xl font-semibold">Lopend</h2>
				{#each running as c (c.id)}
					<Card class="flex flex-col gap-3">
						<PersonRow person={c.other} note={c.iAmChallenger ? 'jij daagde uit' : 'daagde jou uit'} />
						<p class="font-heading text-lg font-semibold">{c.title}</p>
						{#if c.status === 'pending'}
							<p class="text-text-muted">Wacht tot {c.other.displayName} de uitdaging accepteert.</p>
							<div><Button variant="ghost" size="sm" disabled={busy} onclick={() => remove(c)}>Uitdaging intrekken</Button></div>
						{:else}
							<dl class="grid grid-cols-2 gap-3">
								<div class={['rounded-tile bg-surface-2 p-3', c.me && c.them && c.me.score > c.them.score && 'ring-2 ring-sage']}>
									<dt class="text-sm text-text-muted">Jij</dt>
									<dd class="font-heading text-lg font-semibold">{scoreText(c.me)}</dd>
								</div>
								<div class={['rounded-tile bg-surface-2 p-3', c.me && c.them && c.them.score > c.me.score && 'ring-2 ring-sage']}>
									<dt class="truncate text-sm text-text-muted">{c.other.displayName}</dt>
									<dd class="font-heading text-lg font-semibold">{scoreText(c.them)}</dd>
								</div>
							</dl>
							<p class="min-h-6 font-semibold" aria-live="polite">{verdict(c)}</p>
							<div class="flex flex-wrap gap-3">
								{#if c.mySetId}<Button href="/sets/{c.mySetId}/practice?mode=test" class="min-w-40"><Icon name="play" size={18} /> Toets maken</Button>{/if}
								<Button variant="ghost" disabled={busy} onclick={() => remove(c)}>Verwijderen</Button>
							</div>
						{/if}
					</Card>
				{/each}
			</section>
		{/if}

		{#if declined.length > 0}
			<section class="flex flex-col gap-3" aria-labelledby="ch-no">
				<h2 id="ch-no" class="font-heading text-xl font-semibold">Afgewezen</h2>
				{#each declined as c (c.id)}
					<Card class="flex items-center gap-3">
						<p class="min-w-0 flex-1 truncate">{c.other.displayName} wees "{c.title}" af.</p>
						<Chip>Afgewezen</Chip>
						<Button variant="ghost" size="sm" disabled={busy} onclick={() => remove(c)}>Verwijderen</Button>
					</Card>
				{/each}
			</section>
		{/if}
	{/if}
</div>
