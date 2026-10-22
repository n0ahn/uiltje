<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { copyOfSet } from '../../social/copy';
	import type { SharedSet } from '../../social/types';
	import { toasts } from '../../state/toast.svelte';
	import { StorageError } from '../../storage/adapter';
	import { getStorage } from '../../storage';
	import { newId } from '../../utils/id';
	import SharedSetSkeleton from '../skeleton/SharedSetSkeleton.svelte';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Owl from '../ui/Owl.svelte';
	import PersonRow from './PersonRow.svelte';

	// The landing page of a shared set (by link or sent by a friend): look first, then make your own copy.
	type Props = {
		load: () => Promise<SharedSet | null>;
		/** Runs after the copy is saved (a set sent by a friend is marked as accepted). */
		onadded?: () => Promise<void>;
		/** Where "Terug" goes when the set does not exist. */
		backHref?: string;
		signedIn: boolean;
	};
	let { load, onadded, backHref = '/', signedIn }: Props = $props();

	let shared = $state<SharedSet | null>(null);
	let phase = $state<'loading' | 'ready' | 'missing' | 'failed'>('loading');
	let adding = $state(false);
	let error = $state('');

	onMount(async () => {
		try {
			shared = await load();
			phase = shared ? 'ready' : 'missing';
		} catch {
			phase = 'failed';
		}
	});

	async function add() {
		if (!shared || adding) return;
		adding = true;
		error = '';
		try {
			const copy = copyOfSet(shared.set, newId);
			await getStorage().saveSet(copy);
			await onadded?.().catch(() => undefined); // the copy is safe; marking the share is best effort
			toasts.show(`"${copy.title}" staat nu in je sets`);
			await goto(`/sets/${copy.id}`);
		} catch (e) {
			error = e instanceof StorageError ? e.message : 'Toevoegen is niet gelukt. Probeer het opnieuw.';
			adding = false;
		}
	}
</script>

{#if phase === 'loading'}
	<SharedSetSkeleton />
{:else if phase === 'missing' || phase === 'failed'}
	<div class="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
		<Owl pose="sleepy" size={96} />
		<h1 class="font-heading text-2xl font-semibold">{phase === 'missing' ? 'Deze set is niet (meer) gedeeld' : 'Laden lukt niet'}</h1>
		<p class="text-text-muted">
			{phase === 'missing' ? 'De link klopt niet, of de eigenaar is gestopt met delen.' : 'Controleer je internetverbinding en probeer het opnieuw.'}
		</p>
		<Button href={backHref}>Terug</Button>
	</div>
{:else if shared}
	<Card class="mx-auto flex max-w-xl flex-col gap-4">
		<PersonRow person={shared.owner} note="deelt een set met je" />
		<div>
			<h1 class="font-heading text-3xl font-semibold">{shared.set.title}</h1>
			<p class="text-text-muted">
				{shared.set.subject}{shared.set.folder ? ` · ${shared.set.folder}` : ''} · {shared.listCount}
				{shared.listCount === 1 ? 'lijst' : 'lijsten'} · {shared.rowCount} {shared.rowCount === 1 ? 'onderdeel' : 'onderdelen'}
			</p>
		</div>
		<ul class="flex flex-col gap-1.5">
			{#each shared.set.lists.slice(0, 6) as list (list.id)}
				<li class="flex items-baseline justify-between gap-3 rounded-tile bg-surface-2 px-3 py-2">
					<span class="min-w-0 truncate font-semibold">{list.title}</span>
					<span class="shrink-0 text-sm text-text-muted">{list.rows.length}</span>
				</li>
			{/each}
			{#if shared.set.lists.length > 6}
				<li class="px-3 text-sm text-text-muted">en nog {shared.set.lists.length - 6} {shared.set.lists.length - 6 === 1 ? 'lijst' : 'lijsten'}</li>
			{/if}
		</ul>
		<p class="text-sm text-text-muted">Je krijgt een eigen kopie. Als jij iets aanpast, verandert er niets bij de ander, en andersom ook niet.</p>
		<div class="flex flex-wrap items-center gap-3">
			<Button size="lg" class="min-w-56" disabled={adding} onclick={add}>{adding ? 'Bezig…' : 'Toevoegen aan mijn sets'}</Button>
			{#if !signedIn}<span class="text-sm text-text-muted">Zonder account komt de kopie alleen op dit apparaat.</span>{/if}
		</div>
		<p class="min-h-6 text-sm font-semibold text-rose-edge" role="alert">{error}</p>
	</Card>
{/if}
