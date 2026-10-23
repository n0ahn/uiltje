<script lang="ts">
	import { onMount } from 'svelte';
	import { requestGrade } from '../../ai/explain-client';
	import { createDisputesApi } from '../../grammar/disputes';
	import { StorageError } from '../../storage/adapter';
	import { buildExplainItems, ExplainSession, type Rating } from '../../engine/explain';
	import { selectRows } from '../../engine/options';
	import { resolveItem } from '../../grammar/catalogues';
	import { describe } from '../../grammar/rows';
	import type { StudySet } from '../../schema/types';
	import { auth } from '../../state/auth.svelte';
	import PracticeSkeleton from '../skeleton/PracticeSkeleton.svelte';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Chip from '../ui/Chip.svelte';
	import Icon from '../ui/Icon.svelte';
	import Owl from '../ui/Owl.svelte';
	import ProgressBar from '../ui/ProgressBar.svelte';
	import type { ExplainConfig } from './config';

	// "Uitleggen": explain a begrip in your own words, see the official explanation, rate yourself; at the end the AI
	// checks all answers in one request (engine/explain.ts). Nothing is saved: this does not count for progress.
	type Props = { sets: StudySet[]; config: ExplainConfig; title: string; backHref: string; onrestart: () => void };
	let { sets, config, title, backHref, onrestart }: Props = $props();

	// svelte-ignore state_referenced_locally
	const rows = selectRows(sets, config.selection, { strictness: config.strictness, onlyRowKeys: null });
	// svelte-ignore state_referenced_locally
	const items = buildExplainItems(rows, {
		count: config.count,
		referenceOf: (ref) => {
			const found = resolveItem(ref);
			return found ? describe(found.item) : undefined;
		}
	});
	const session = new ExplainSession(items);

	let rev = $state(0);
	const v = $derived.by(() => {
		void rev;
		return { current: session.current, index: session.index, total: session.total, finished: session.finished, revealed: session.revealed };
	});

	let answer = $state('');
	let phase = $state<'practice' | 'checking' | 'result'>('practice');
	let checkNote = $state('');
	let answerEl: HTMLTextAreaElement | undefined = $state();
	let abort: AbortController | null = null;

	onMount(() => () => abort?.abort());

	function submit() {
		session.submit(answer);
		rev++;
	}

	async function next() {
		session.next();
		answer = '';
		rev++;
		if (session.finished) await finish();
		else queueMicrotask(() => answerEl?.focus());
	}

	let checkFailed = $state(false);

	/** One request for the whole run. The learner never grades themselves: a failed check can be retried. */
	async function finish() {
		const toGrade = session.toGrade();
		checkFailed = false;
		checkNote = '';
		if (!auth.user) {
			checkFailed = true;
			checkNote = 'Log in om je antwoorden door de AI te laten nakijken.';
		} else if (toGrade.length === 0) {
			session.applyAi([]);
		} else {
			phase = 'checking';
			abort = new AbortController();
			const result = await requestGrade(
				toGrade.map((g) => ({ ...(g.item.ref ? { ref: g.item.ref } : {}), term: g.item.term, reference: g.item.reference, answer: g.answer, strict: g.item.strict })),
				abort.signal
			);
			abort = null;
			if (result.ok) session.applyAi(result.results.map((r) => ({ ...r, index: toGrade[r.index]?.index ?? -1 })));
			else {
				checkFailed = true;
				checkNote = result.message;
			}
		}
		rev++;
		phase = 'result';
	}

	function onWindowKey(event: KeyboardEvent) {
		if (phase !== 'practice' || !v.revealed) return;
		if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement || event.target instanceof HTMLAnchorElement) return;
		if (event.key === 'Enter') {
			event.preventDefault();
			void next();
		}
	}

	const summary = $derived.by(() => {
		void rev;
		return session.summary();
	});
	const outcomes = $derived.by(() => {
		void rev;
		return session.outcomes();
	});
	// "Ik ben het er niet mee eens": the learner explains why; the owner reads it on /review.
	let disputeOpen = $state<string | null>(null);
	let disputeNote = $state('');
	let disputeBusy = $state(false);
	let disputeError = $state('');
	let disputed = $state<Record<string, boolean>>({});

	async function sendDispute(outcome: (typeof outcomes)[number]) {
		if (!auth.client || !outcome.ai || disputeBusy) return;
		disputeBusy = true;
		disputeError = '';
		try {
			await createDisputesApi(auth.client).submit({
				...(outcome.item.ref ? { ref: outcome.item.ref } : {}),
				term: outcome.item.term,
				reference: outcome.item.reference,
				answer: outcome.answer,
				aiVerdict: outcome.ai.verdict,
				aiFeedback: outcome.ai.feedback,
				note: disputeNote
			});
			disputed[outcome.item.key] = true;
			disputeOpen = null;
			disputeNote = '';
		} catch (error) {
			disputeError = error instanceof StorageError ? error.message : 'Versturen is mislukt.';
		} finally {
			disputeBusy = false;
		}
	}

	const LABEL: Record<Rating, string> = { goed: 'Goed', bijna: 'Bijna', niet: 'Nog niet' };
	const TONE: Record<Rating, string> = { goed: 'bg-sage-soft', bijna: 'bg-surface-2', niet: 'bg-rose-soft' };
</script>

<svelte:head><title>Uitleggen · {title} · Uiltje</title></svelte:head>
<svelte:window onkeydown={onWindowKey} />

{#if items.length === 0}
	<p class="py-16 text-center text-text-muted">Er zijn geen begrippen om uit te leggen.</p>
{:else if phase === 'checking'}
	<div class="mx-auto flex w-full max-w-3xl flex-col gap-4">
		<div class="flex items-center gap-3" role="status" aria-live="polite">
			<Owl pose="thinking" size={56} />
			<div>
				<h1 class="font-heading text-2xl font-semibold">Uiltje kijkt je antwoorden na…</h1>
				<p class="text-text-muted">Dit duurt meestal 5 tot 20 seconden.</p>
			</div>
		</div>
		<PracticeSkeleton />
	</div>
{:else if phase === 'result'}
	<div class="mx-auto flex w-full max-w-3xl flex-col gap-4">
		<Card class="flex flex-col gap-3 sm:p-8">
			<div class="flex items-center gap-3">
				<Owl pose="happy" size={64} />
				<div>
					<h1 class="font-heading text-2xl font-semibold">{summary.goed} van {summary.total} goed uitgelegd</h1>
					<p class="text-text-muted">{summary.bijna} bijna · {summary.niet} nog niet{summary.checkedByAi ? ' · nagekeken door de AI' : ''}</p>
				</div>
			</div>
			{#if checkNote}<p class="rounded-tile bg-surface-2 p-3 text-sm font-semibold" role="status">{checkNote}</p>{/if}
			<div class="flex flex-wrap gap-3">
				{#if checkFailed}<Button size="lg" onclick={() => { phase = 'checking'; void finish(); }} disabled={!auth.user}><Icon name="repeat" size={20} /> Opnieuw nakijken</Button>{/if}
				<Button size="lg" variant={checkFailed ? 'secondary' : 'primary'} onclick={onrestart}><Icon name="repeat" size={20} /> Nog een keer</Button>
				<Button size="lg" variant="secondary" href={backHref}>Klaar</Button>
			</div>
		</Card>

		{#each outcomes as outcome (outcome.item.key)}
			{@const verdict = outcome.ai?.verdict ?? 'niet'}
			<Card class="flex flex-col gap-2">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<h2 class="min-w-0 font-heading text-lg font-semibold">{outcome.item.term}</h2>
					<span class={['rounded-full px-2.5 py-0.5 text-xs font-semibold', TONE[verdict]]}>{outcome.ai ? `AI: ${LABEL[verdict]}` : 'Niet nagekeken'}</span>
				</div>
				<p class="text-sm"><span class="font-semibold">Jouw uitleg:</span> {outcome.answer || '(niets ingevuld)'}</p>
				{#if outcome.ai?.feedback}<p class={['rounded-tile px-3 py-2 text-sm', TONE[outcome.ai.verdict]]}>{outcome.ai.feedback}</p>{/if}
				<p class="text-sm text-text-muted"><span class="font-semibold">Syllabus:</span> {outcome.item.reference}</p>
				{#if outcome.ai && outcome.ai.verdict !== 'goed' && outcome.answer !== ''}
					{#if disputed[outcome.item.key]}
						<p class="text-sm font-semibold text-text-muted">Je bezwaar is verstuurd. De beheerder kijkt ernaar.</p>
					{:else if disputeOpen === outcome.item.key}
						<label>
							<span class="mb-1 block text-sm font-semibold text-text-muted">Waarom ben je het er niet mee eens?</span>
							<textarea class="input min-h-20" bind:value={disputeNote} maxlength="600" placeholder="Bijvoorbeeld: mijn uitleg zegt hetzelfde als de syllabus, maar in andere woorden."></textarea>
						</label>
						<p class="min-h-5 text-sm font-semibold text-rose-edge" role="alert">{disputeError}</p>
						<div class="flex gap-2">
							<Button size="sm" disabled={disputeBusy} onclick={() => sendDispute(outcome)}>Verstuur bezwaar</Button>
							<Button size="sm" variant="ghost" onclick={() => (disputeOpen = null)}>Annuleren</Button>
						</div>
					{:else}
						<div><Button size="sm" variant="ghost" onclick={() => { disputeOpen = outcome.item.key; disputeNote = ''; disputeError = ''; }}>Ik ben het er niet mee eens</Button></div>
					{/if}
				{/if}
			</Card>
		{/each}
	</div>
{:else if v.current}
	<div class="mx-auto flex w-full max-w-3xl flex-col gap-4">
		<div class="flex items-center gap-3">
			<Button href={backHref} variant="ghost" size="sm" iconOnly aria-label="Stoppen met oefenen"><Icon name="x" size={20} /></Button>
			<div class="min-w-0 flex-1 text-center">
				<p class="truncate font-heading font-semibold">{title}</p>
				<p class="truncate text-sm text-text-muted">Begrip {v.index + 1} van {v.total}</p>
			</div>
			<Chip active>Uitleggen</Chip>
		</div>
		<ProgressBar value={v.total === 0 ? 0 : v.index / v.total} label="Voortgang" />

		<Card class="flex min-h-96 flex-col gap-5 sm:p-8">
			<p class="text-sm font-semibold tracking-wide text-text-muted uppercase">Leg uit in je eigen woorden</p>
			<p class="font-heading text-3xl font-semibold">{v.current.term}</p>

			{#if !v.revealed}
				<form class="flex flex-col gap-3" onsubmit={(e) => { e.preventDefault(); submit(); }}>
					<textarea
						bind:this={answerEl}
						bind:value={answer}
						class="input min-h-32"
						autocomplete="off"
						spellcheck="true"
						aria-label="Jouw uitleg van {v.current.term}"
						placeholder="Wat is het, en waaraan herken je het? (Weet je het niet? Laat leeg en kijk wat de syllabus zegt.)"
						maxlength="1500"
					></textarea>
					<div class="flex flex-wrap gap-3">
						<Button size="lg" type="submit" class="min-w-44">{answer.trim() === '' ? 'Ik weet het niet' : 'Laat zien'}</Button>
					</div>
				</form>
			{:else}
				<div class="flex flex-col gap-3">
					<p class="rounded-tile bg-surface-2 p-3"><span class="block text-sm font-semibold text-text-muted">Jouw uitleg</span>{answer || '(niets ingevuld)'}</p>
					<p class="rounded-tile bg-sage-soft p-3"><span class="block text-sm font-semibold text-text-muted">Uitleg uit de syllabus</span>{v.current.reference}</p>
					<p class="text-sm text-text-muted">Vergelijk goed. De AI kijkt je antwoorden aan het eind na.</p>
					<div class="flex flex-wrap gap-3">
						<Button size="lg" class="min-w-44" onclick={next}>{v.index + 1 >= v.total ? 'Klaar, laat nakijken' : 'Volgende'}</Button>
					</div>
				</div>
			{/if}
		</Card>
	</div>
{/if}
