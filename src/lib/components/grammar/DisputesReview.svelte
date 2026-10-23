<script lang="ts">
	import { untrack } from 'svelte';
	import { createDisputesApi, type Dispute, type DisputeStatus } from '../../grammar/disputes';
	import { auth } from '../../state/auth.svelte';
	import { toasts } from '../../state/toast.svelte';
	import { StorageError } from '../../storage/adapter';
	import SuggestionsSkeleton from '../skeleton/SuggestionsSkeleton.svelte';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Icon from '../ui/Icon.svelte';

	// Owner only, part of /review: learners who disagree with the AI's verdict on their "Uitleggen" answer.
	let { oncount }: { oncount?: (n: number) => void } = $props();

	let loading = $state(true);
	let failed = $state('');
	let items = $state<Dispute[]>([]);
	let busyId = $state<string | null>(null);

	const dateFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' });
	const LABEL = { goed: 'Goed', bijna: 'Bijna', niet: 'Nog niet' } as const;

	async function load() {
		if (!auth.client) return;
		loading = true;
		failed = '';
		try {
			items = await createDisputesApi(auth.client).list('new');
			oncount?.(items.length);
		} catch (error) {
			failed = error instanceof StorageError ? error.message : 'Laden is mislukt.';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (auth.client && auth.user) untrack(() => void load());
	});

	async function resolve(item: Dispute, status: DisputeStatus) {
		if (!auth.client || busyId) return;
		busyId = item.id;
		try {
			await createDisputesApi(auth.client).resolve(item.id, status);
			items = items.filter((i) => i.id !== item.id);
			oncount?.(items.length);
			toasts.show(status === 'accepted' ? 'Bezwaar terecht: de AI zat ernaast' : 'Bezwaar afgewezen');
		} catch (error) {
			toasts.show(error instanceof StorageError ? error.message : 'Dat lukte niet');
		} finally {
			busyId = null;
		}
	}
</script>

{#if loading}
	<SuggestionsSkeleton />
{:else if failed}
	<Card class="flex flex-col items-start gap-3">
		<p class="font-semibold text-rose-edge" role="alert">{failed}</p>
		<p class="text-sm text-text-muted">Heb je <code>ai/sql/007_explain_disputes.sql</code> al gedraaid?</p>
		<Button variant="secondary" onclick={load}>Opnieuw proberen</Button>
	</Card>
{:else}
	<div class="mx-auto flex w-full max-w-3xl flex-col gap-4">
		{#each items as item (item.id)}
			<Card class="flex flex-col gap-2">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<h2 class="min-w-0 font-heading text-lg font-semibold">{item.term}</h2>
					<span class="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap">{dateFormat.format(item.createdAt)}</span>
				</div>
				<p class="rounded-tile bg-surface-2 px-3 py-2 text-sm"><span class="block font-semibold text-text-muted">Antwoord van de leerling</span>{item.answer || '(niets ingevuld)'}</p>
				<p class="rounded-tile bg-sage-soft px-3 py-2 text-sm"><span class="block font-semibold text-text-muted">Syllabus</span>{item.reference}</p>
				<p class="rounded-tile bg-rose-soft px-3 py-2 text-sm"><span class="block font-semibold text-text-muted">Oordeel van de AI: {LABEL[item.aiVerdict]}</span>{item.aiFeedback || '(geen feedback)'}</p>
				<p class="rounded-tile border border-border px-3 py-2 text-sm"><span class="block font-semibold text-text-muted">Bezwaar van de leerling</span>{item.note || '(geen toelichting)'}</p>
				<div class="mt-1 flex flex-wrap gap-2">
					<Button size="sm" disabled={busyId !== null} onclick={() => resolve(item, 'accepted')}><Icon name="check" size={16} /> Terecht (AI zat ernaast)</Button>
					<Button size="sm" variant="ghost" disabled={busyId !== null} onclick={() => resolve(item, 'rejected')}><Icon name="x" size={16} /> Afwijzen</Button>
				</div>
			</Card>
		{:else}
			<Card class="text-center text-text-muted">Geen bezwaren. De AI heeft het goed gedaan.</Card>
		{/each}
	</div>
{/if}
