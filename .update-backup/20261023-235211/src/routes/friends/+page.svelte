<script lang="ts">
	import type { PageProps } from './$types';
	import { onMount } from 'svelte';
	import FriendsSkeleton from '#lib/components/skeleton/FriendsSkeleton.svelte';
	import PersonRow from '#lib/components/social/PersonRow.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Chip from '#lib/components/ui/Chip.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import Modal from '#lib/components/ui/Modal.svelte';
	import Owl from '#lib/components/ui/Owl.svelte';
	import { getSocial } from '#lib/social/index.js';
	import type { FoundPerson, Friendship, IncomingShare, Person } from '#lib/social/types.js';
	import { profile } from '#lib/state/profile.svelte.js';
	import { toasts } from '#lib/state/toast.svelte.js';
	import { StorageError } from '#lib/storage/adapter.js';

	let { data }: PageProps = $props();

	let friendships = $state<Friendship[] | null>(null);
	let shares = $state<IncomingShare[]>([]);
	let failed = $state(false);

	let query = $state('');
	let found = $state<FoundPerson[]>([]);
	let searching = $state(false);
	let searched = $state(false);
	let busyId = $state<string | null>(null);
	let removing = $state<Person | null>(null);
	let confirmOpen = $state(false);

	const friends = $derived((friendships ?? []).filter((f) => f.status === 'accepted'));
	const incoming = $derived((friendships ?? []).filter((f) => f.status === 'pending' && f.incoming));
	const outgoing = $derived((friendships ?? []).filter((f) => f.status === 'pending' && !f.incoming));
	const inviteUrl = $derived(profile.data ? `${location.origin}/i/${profile.data.friendCode}` : '');

	function message(e: unknown): string {
		return e instanceof StorageError ? e.message : 'Er ging iets mis. Probeer het opnieuw.';
	}

	async function load() {
		failed = false;
		try {
			const social = getSocial();
			const [list, inbox] = await Promise.all([social.listFriendships(), social.listIncomingShares(), profile.load()]);
			friendships = list;
			shares = inbox;
		} catch {
			failed = true;
		}
	}
	onMount(() => {
		if (data.user) void load();
	});

	// Search after a short pause, from 3 characters. A slower earlier answer never replaces a newer one.
	let searchRun = 0;
	$effect(() => {
		const q = query.trim();
		const run = ++searchRun;
		if (q.length < 3) {
			found = [];
			searched = false;
			searching = false;
			return;
		}
		searching = true;
		const timer = setTimeout(async () => {
			try {
				const result = await getSocial().searchPeople(q);
				if (run === searchRun) {
					found = result;
					searched = true;
				}
			} catch (e) {
				if (run === searchRun) toasts.show(message(e));
			} finally {
				if (run === searchRun) searching = false;
			}
		}, 300);
		return () => clearTimeout(timer);
	});

	async function act(id: string, job: () => Promise<void>, done?: string) {
		if (busyId) return;
		busyId = id;
		try {
			await job();
			if (done) toasts.show(done);
			friendships = await getSocial().listFriendships();
		} catch (e) {
			toasts.show(message(e));
		} finally {
			busyId = null;
		}
	}

	async function add(person: FoundPerson) {
		await act(
			person.id,
			async () => {
				const outcome = await getSocial().sendFriendRequest(person.id);
				found = found.map((p) => (p.id === person.id ? { ...p, relation: outcome === 'accepted' ? 'friend' : 'outgoing' } : p));
			},
			'Verzoek verstuurd'
		);
	}

	const respond = (p: Person, accept: boolean) =>
		act(p.id, () => getSocial().respondToRequest(p.id, accept), accept ? `Je bent nu bevriend met ${p.displayName}` : undefined);

	const cancel = (p: Person) => act(p.id, () => getSocial().removeFriendship(p.id));

	async function confirmRemove() {
		const person = removing;
		confirmOpen = false;
		if (person) await act(person.id, () => getSocial().removeFriendship(person.id), `${person.displayName} is geen vriend meer`);
	}

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(inviteUrl);
			toasts.show('Link gekopieerd');
		} catch {
			toasts.show('Kopiëren lukt niet. Selecteer de link en kopieer hem zelf.');
		}
	}

	async function newLink() {
		try {
			await getSocial().regenerateInviteCode();
			await profile.load();
			toasts.show('Nieuwe link gemaakt. De oude werkt niet meer.');
		} catch (e) {
			toasts.show(message(e));
		}
	}

	async function dismissShare(share: IncomingShare) {
		try {
			await getSocial().respondToShare(share.shareId, false);
			shares = shares.filter((s) => s.shareId !== share.shareId);
		} catch (e) {
			toasts.show(message(e));
		}
	}
</script>

<svelte:head><title>Vrienden · Uiltje</title></svelte:head>

<div class="flex flex-col gap-5">
	<div class="flex flex-wrap items-center gap-3">
		<div class="min-w-0 flex-1">
			<h1 class="font-heading text-3xl font-semibold">Vrienden</h1>
			<p class="text-text-muted">Oefen samen en deel sets met elkaar.</p>
		</div>
		{#if data.user}<Button href="/leaderboard" variant="secondary"><Icon name="trophy" size={18} /> Ranglijst</Button>{/if}
	</div>

	{#if !data.user}
		<Card class="mx-auto flex max-w-lg flex-col items-center gap-3 py-10 text-center">
			<Owl pose="idle" size={96} />
			<h2 class="font-heading text-2xl font-semibold">Log in om vrienden toe te voegen</h2>
			<p class="text-text-muted">Met een account zie je hoe je vrienden oefenen en kun je sets naar elkaar sturen.</p>
			<Button href="/login">Inloggen</Button>
		</Card>
	{:else if failed && friendships === null}
		<Card class="flex flex-col items-start gap-3">
			<p>Je vrienden laden lukt niet. Controleer je internetverbinding en probeer het opnieuw. Heb je <code>002_social.sql</code> al uitgevoerd?</p>
			<Button variant="secondary" onclick={load}>Opnieuw proberen</Button>
		</Card>
	{:else if friendships === null}
		<FriendsSkeleton />
	{:else}
		<div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
			<div class="flex min-w-0 flex-col gap-5">
				<Card class="flex flex-col gap-3">
					<h2 class="font-heading text-lg font-semibold">Vriend zoeken</h2>
					<Input label="Gebruikersnaam" bind:value={query} placeholder="Typ minstens 3 tekens van een gebruikersnaam" autocomplete="off" autocapitalize="none" spellcheck={false} />
					<div class="min-h-12" aria-live="polite">
						{#if query.trim().length >= 3 && searching && found.length === 0}
							<p class="text-sm text-text-muted">Zoeken…</p>
						{:else if searched && found.length === 0 && query.trim().length >= 3}
							<p class="text-sm text-text-muted">Niemand gevonden met een gebruikersnaam die zo begint.</p>
						{/if}
						<ul class="flex flex-col gap-3">
							{#each found as person (person.id)}
								<li>
									<PersonRow {person}>
										{#snippet actions()}
											{#if person.relation === 'friend'}
												<Chip>Vrienden</Chip>
											{:else if person.relation === 'outgoing'}
												<Chip>Verzoek verstuurd</Chip>
											{:else if person.relation === 'incoming'}
												<Button size="sm" class="min-w-28" disabled={busyId === person.id} onclick={() => respond(person, true)}>Accepteren</Button>
											{:else}
												<Button size="sm" class="min-w-28" disabled={busyId === person.id} onclick={() => add(person)}><Icon name="user-plus" size={16} /> Toevoegen</Button>
											{/if}
										{/snippet}
									</PersonRow>
								</li>
							{/each}
						</ul>
					</div>
				</Card>

				{#if incoming.length > 0 || outgoing.length > 0}
					<Card class="flex flex-col gap-3">
						<h2 class="font-heading text-lg font-semibold">Verzoeken</h2>
						<ul class="flex flex-col gap-3">
							{#each incoming as person (person.id)}
								<li>
									<PersonRow {person} note="wil bevriend worden">
										{#snippet actions()}
											<Button size="sm" iconOnly aria-label="Accepteren" disabled={busyId === person.id} onclick={() => respond(person, true)}><Icon name="check" size={18} /></Button>
											<Button size="sm" iconOnly variant="secondary" aria-label="Weigeren" disabled={busyId === person.id} onclick={() => respond(person, false)}><Icon name="x" size={18} /></Button>
										{/snippet}
									</PersonRow>
								</li>
							{/each}
							{#each outgoing as person (person.id)}
								<li>
									<PersonRow {person} note="wacht op antwoord">
										{#snippet actions()}
											<Button size="sm" variant="ghost" disabled={busyId === person.id} onclick={() => cancel(person)}>Intrekken</Button>
										{/snippet}
									</PersonRow>
								</li>
							{/each}
						</ul>
					</Card>
				{/if}

				<Card class="flex flex-col gap-3">
					<h2 class="font-heading text-lg font-semibold">Jouw vrienden{friends.length > 0 ? ` (${friends.length})` : ''}</h2>
					{#if friends.length === 0}
						<div class="flex flex-col items-center gap-2 py-6 text-center">
							<Owl pose="idle" size={72} />
							<p class="text-text-muted">Nog geen vrienden. Zoek er een, of stuur je uitnodigingslink.</p>
						</div>
					{:else}
						<ul class="flex flex-col gap-3">
							{#each friends as person (person.id)}
								<li>
									<PersonRow {person} href="/u/{person.username}">
										{#snippet actions()}
											<Button
												size="sm"
												iconOnly
												variant="ghost"
												aria-label="{person.displayName} verwijderen als vriend"
												disabled={busyId === person.id}
												onclick={() => {
													removing = person;
													confirmOpen = true;
												}}><Icon name="trash" size={18} /></Button
											>
										{/snippet}
									</PersonRow>
								</li>
							{/each}
						</ul>
					{/if}
				</Card>
			</div>

			<div class="flex min-w-0 flex-col gap-5">
				<Card class="flex flex-col gap-3">
					<h2 class="font-heading text-lg font-semibold">Uitnodigingslink</h2>
					<p class="text-sm text-text-muted">Stuur deze link naar iemand. Wie hem opent en inlogt, is meteen je vriend.</p>
					<Input label="Jouw link" value={inviteUrl} readonly onfocus={(e) => e.currentTarget.select()} />
					<div class="flex flex-wrap gap-3">
						<Button variant="secondary" class="min-w-32" disabled={!inviteUrl} onclick={copyLink}><Icon name="copy" size={18} /> Kopiëren</Button>
						<Button variant="ghost" disabled={!inviteUrl} onclick={newLink}>Nieuwe link</Button>
					</div>
				</Card>

				<Card class="flex flex-col gap-3">
					<h2 class="font-heading text-lg font-semibold">Gedeeld met jou</h2>
					{#if shares.length === 0}
						<p class="text-sm text-text-muted">Sets die vrienden naar je sturen verschijnen hier.</p>
					{:else}
						<ul class="flex flex-col gap-3">
							{#each shares as share (share.shareId)}
								<li class="flex flex-col gap-2 rounded-tile bg-surface-2 p-3">
									<PersonRow person={share.sender} size={32} note="stuurde je een set" />
									<p class="font-semibold">{share.title}</p>
									<p class="text-sm text-text-muted">{share.subject} · {share.listCount} {share.listCount === 1 ? 'lijst' : 'lijsten'} · {share.rowCount} {share.rowCount === 1 ? 'onderdeel' : 'onderdelen'}</p>
									<div class="flex gap-2">
										<Button size="sm" href="/gedeeld/{share.shareId}">Bekijken</Button>
										<Button size="sm" variant="ghost" onclick={() => dismissShare(share)}>Negeren</Button>
									</div>
								</li>
							{/each}
						</ul>
					{/if}
				</Card>
			</div>
		</div>
	{/if}
</div>

<Modal bind:open={confirmOpen} title="Vriend verwijderen?">
	<p>{removing?.displayName} verdwijnt uit je vrienden en jullie zien elkaar niet meer op de ranglijst.</p>
	{#snippet actions()}
		<Button variant="ghost" onclick={() => (confirmOpen = false)}>Annuleren</Button>
		<Button variant="danger" onclick={confirmRemove}>Verwijderen</Button>
	{/snippet}
</Modal>
