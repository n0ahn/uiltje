<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { requestGrade } from '../../ai/explain-client';
	import { createDisputesApi } from '../../grammar/disputes';
	import { StorageError } from '../../storage/adapter';
	import { buildExplainItems, ExplainSession, type Rating } from '../../engine/explain';
	import { selectRows } from '../../engine/options';
	import { resolveItem } from '../../grammar/catalogues';
	import { describe } from '../../grammar/rows';
	import type { StudySet } from '../../schema/types';
	import { auth } from '../../state/auth.svelte';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Chip from '../ui/Chip.svelte';
	import Icon from '../ui/Icon.svelte';
	import Owl from '../ui/Owl.svelte';
	import ProgressBar from '../ui/ProgressBar.svelte';
	import Skeleton from '../ui/Skeleton.svelte';
	import type { ExplainConfig } from './config';

	// "Uitleggen": explain a begrip in your own words, see the official explanation, and the AI checks it right away
	// (goed / bijna / niet). "Bijna": you decide. "Niet": you may object (counts as goed, the owner reads it on /review).
	// A term that ends "niet" comes back later in the run. Nothing is saved: this does not count for progress.
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

	// The session is a plain class: `rev` tells Svelte it changed.
	let rev = $state(0);
	const v = $derived.by(() => {
		void rev;
		const attempt = session.attempt;
		return {
			current: session.current,
			total: session.total,
			remaining: session.remaining,
			finished: session.finished,
			revealed: session.revealed,
			tries: session.tries,
			attempt: attempt ? { answer: attempt.answer, ai: attempt.ai, resolution: attempt.resolution } : null,
			needsChoice: session.needsChoice,
			canObject: session.canObject,
			canContinue: session.canContinue,
			willRepeat: session.willRepeat
		};
	});

	let answer = $state('');
	let phase = $state<'practice' | 'result'>('practice');
	let answerEl: HTMLTextAreaElement | undefined = $state();

	// The check of the open attempt: 'checking' while the request runs, 'failed' when it did not work (retry).
	let gradeState = $state<'idle' | 'checking' | 'failed'>('idle');
	let gradeNote = $state('');
	let abort: AbortController | null = null;
	let ticket = 0;

	onMount(() => () => {
		ticket++;
		abort?.abort();
	});

	async function submit() {
		session.submit(answer);
		rev++;
		await grade();
	}

	/** One request per answer, started right when the learner presses "Laat zien", so the check runs while they read the syllabus. */
	async function grade() {
		const item = session.current;
		const attempt = session.attempt;
		if (!item || !attempt || attempt.ai) return;
		if (!auth.user) {
			gradeState = 'failed';
			gradeNote = 'Log in om je antwoord door de AI te laten nakijken.';
			return;
		}
		const mine = ++ticket;
		abort?.abort();
		abort = new AbortController();
		gradeState = 'checking';
		gradeNote = '';
		const result = await requestGrade([{ ...(item.ref ? { ref: item.ref } : {}), term: item.term, reference: item.reference, answer: attempt.answer, strict: item.strict }], abort.signal);
		if (mine !== ticket) return;
		abort = null;
		const verdict = result.ok ? result.results.find((r) => r.index === 0) : undefined;
		if (verdict) {
			session.applyVerdict({ verdict: verdict.verdict, feedback: verdict.feedback });
			gradeState = 'idle';
		} else {
			gradeState = 'failed';
			gradeNote = result.ok ? 'Het nakijken is mislukt.' : result.message;
		}
		rev++;
	}

	function choose(correct: boolean) {
		session.choose(correct);
		rev++;
	}

	async function next() {
		if (!session.canContinue) return;
		session.next();
		answer = '';
		gradeState = 'idle';
		gradeNote = '';
		objectionOpen = false;
		objectionNote = '';
		objectionError = '';
		rev++;
		if (session.finished) {
			phase = 'result';
			return;
		}
		await tick();
		answerEl?.focus();
	}

	// "Bezwaar": the learner explains (optional) why the AI is wrong; it goes to the owner and the answer counts as goed.
	let objectionOpen = $state(false);
	let objectionNote = $state('');
	let objectionBusy = $state(false);
	let objectionError = $state('');

	async function sendObjection() {
		const item = session.current;
		const attempt = session.attempt;
		if (!item || !attempt?.ai || !session.canObject || objectionBusy) return;
		if (!auth.client) {
			objectionError = 'Log in om bezwaar te maken.';
			return;
		}
		objectionBusy = true;
		objectionError = '';
		try {
			await createDisputesApi(auth.client).submit({
				...(item.ref ? { ref: item.ref } : {}),
				term: item.term,
				reference: item.reference,
				answer: attempt.answer,
				aiVerdict: attempt.ai.verdict,
				aiFeedback: attempt.ai.feedback,
				note: objectionNote
			});
			session.acceptObjection();
			objectionOpen = false;
			objectionNote = '';
			rev++;
		} catch (error) {
			objectionError = error instanceof StorageError ? error.message : 'Versturen is mislukt.';
		} finally {
			objectionBusy = false;
		}
	}

	function onWindowKey(event: KeyboardEvent) {
		if (phase !== 'practice' || !v.revealed || !v.canContinue || objectionOpen) return;
		if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement || event.target instanceof HTMLAnchorElement) return;
		if (event.key === 'Enter') {
			event.preventDefault();
			void next();
		}
	}

	const results = $derived.by(() => {
		void rev;
		return session.results();
	});
	const summary = $derived.by(() => {
		void rev;
		return session.summary();
	});
	const isLast = $derived(v.remaining === 1 && !v.willRepeat);

	const LABEL: Record<Rating, string> = { goed: 'Goed', bijna: 'Bijna', niet: 'Nog niet' };
	const TONE: Record<Rating, string> = { goed: 'bg-sage-soft', bijna: 'bg-surface-2', niet: 'bg-rose-soft' };
</script>

<svelte:head><title>Uitleggen · {title} · Uiltje</title></svelte:head>
<svelte:window onkeydown={onWindowKey} />

{#if items.length === 0}
	<p class="py-16 text-center text-text-muted">Er zijn geen begrippen om uit te leggen.</p>
{:else if phase === 'result'}
	<div class="mx-auto flex w-full max-w-3xl flex-col gap-4">
		<Card class="flex flex-col gap-3 sm:p-8">
			<div class="flex items-center gap-3">
				<Owl pose={summary.unsolved === 0 ? 'cheer' : 'happy'} size={64} />
				<div>
					<h1 class="font-heading text-2xl font-semibold">{summary.firstTry} van {summary.total} meteen goed</h1>
					<p class="text-text-muted">{summary.afterRepeat} goed na herhalen · {summary.unsolved} nog niet gelukt{summary.objections > 0 ? ` · ${summary.objections} bezwaar` : ''}</p>
				</div>
			</div>
			<div class="flex flex-wrap gap-3">
				<Button size="lg" onclick={onrestart}><Icon name="repeat" size={20} /> Nog een keer</Button>
				<Button size="lg" variant="secondary" href={backHref}>Klaar</Button>
			</div>
		</Card>

		{#each results as result (result.item.key)}
			{@const last = result.attempts.at(-1)}
			<Card class="flex flex-col gap-2">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<h2 class="min-w-0 font-heading text-lg font-semibold">{result.item.term}</h2>
					<div class="flex flex-wrap gap-2">
						{#if result.objected}<Chip>Bezwaar</Chip>{/if}
						<Chip active={result.solved}>{!result.solved ? 'Nog niet gelukt' : result.attempts.length === 1 ? 'Meteen goed' : `Goed na ${result.attempts.length} keer`}</Chip>
					</div>
				</div>
				{#if result.attempts.length > 1 || !result.solved}
					<p class="text-sm"><span class="font-semibold">Laatste uitleg:</span> {last?.answer || '(niets ingevuld)'}</p>
					<p class="text-sm text-text-muted"><span class="font-semibold">Syllabus:</span> {result.item.reference}</p>
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
				<p class="truncate text-sm text-text-muted">Nog {v.remaining} van {v.total} te gaan</p>
			</div>
			<Chip active>{v.tries > 0 ? 'Opnieuw' : 'Uitleggen'}</Chip>
		</div>
		<ProgressBar value={v.total === 0 ? 0 : (v.total - v.remaining) / v.total} label="Voortgang" />

		<Card class="flex min-h-96 flex-col gap-5 sm:p-8">
			<p class="text-sm font-semibold tracking-wide text-text-muted uppercase">{v.tries > 0 ? 'Nog een keer: leg uit in je eigen woorden' : 'Leg uit in je eigen woorden'}</p>
			<p class="font-heading text-3xl font-semibold">{v.current.term}</p>

			{#if !v.revealed}
				<form class="flex flex-col gap-3" onsubmit={(e) => { e.preventDefault(); void submit(); }}>
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
						<Button size="lg" type="submit" class="min-w-44">{answer.trim() === '' ? 'Ik weet het niet' : 'Laat zien en nakijken'}</Button>
					</div>
				</form>
			{:else if v.attempt}
				<div class="flex flex-col gap-3">
					<p class="rounded-tile bg-surface-2 p-3"><span class="block text-sm font-semibold text-text-muted">Jouw uitleg</span>{v.attempt.answer || '(niets ingevuld)'}</p>
					<p class="rounded-tile bg-sage-soft p-3"><span class="block text-sm font-semibold text-text-muted">Uitleg uit de syllabus</span>{v.current.reference}</p>

					<!-- Verdict slot: reserved height so the buttons below do not jump when the check is done. -->
					<div class="min-h-24" role="status" aria-live="polite">
						{#if v.attempt.ai}
							{@const verdict = v.attempt.ai.verdict}
							<div class={['flex flex-col gap-1 rounded-tile px-3 py-2 text-sm', TONE[verdict]]}>
								<span class="font-semibold">
									{#if v.attempt.resolution === 'bezwaar'}Bezwaar verstuurd: dit telt als goed.
									{:else if verdict === 'bijna' && v.attempt.resolution === 'goed'}De AI twijfelde; jij vond het goed.
									{:else if verdict === 'bijna' && v.attempt.resolution === 'niet'}De AI twijfelde; jij vond het nog niet goed.
									{:else if verdict === 'bijna'}De AI twijfelt: jij beslist.
									{:else}AI: {LABEL[verdict]}{/if}
								</span>
								{#if v.attempt.ai.feedback}<span>{v.attempt.ai.feedback}</span>{/if}
								{#if v.needsChoice}<span class="text-text-muted">Vergelijk je uitleg met de syllabus. Was jouw uitleg goed genoeg?</span>{/if}
								{#if v.willRepeat && v.attempt.resolution === 'niet'}<span class="text-text-muted">Dit begrip komt straks terug.</span>{/if}
							</div>
						{:else if gradeState === 'failed'}
							<p class="rounded-tile bg-rose-soft px-3 py-2 text-sm font-semibold" role="alert">{gradeNote}</p>
						{:else}
							<div class="flex flex-col gap-2" aria-busy="true">
								<span class="flex items-center gap-2 text-sm font-semibold text-text-muted"><Owl pose="thinking" size={28} /> Uiltje kijkt je uitleg na…</span>
								<Skeleton class="h-4 w-full" />
								<Skeleton class="h-4 w-2/3" />
							</div>
						{/if}
					</div>

					<!-- Action row: fixed position; extra content (objection form) only grows below it. -->
					<div class="flex min-h-12 flex-wrap items-center gap-3">
						{#if v.needsChoice}
							<Button size="lg" variant="sage" onclick={() => choose(true)}><Icon name="check" size={20} /> Ik had het goed</Button>
							<Button size="lg" variant="secondary" onclick={() => choose(false)}>Nog niet goed</Button>
						{:else if gradeState === 'failed' && !v.attempt.ai}
							<Button size="lg" class="min-w-44" onclick={grade} disabled={!auth.user}><Icon name="repeat" size={20} /> Opnieuw nakijken</Button>
						{:else}
							<Button size="lg" class="min-w-44" disabled={!v.canContinue} onclick={next}>{isLast ? 'Afronden' : 'Volgende'}</Button>
							{#if v.canObject}
								<Button size="sm" variant="ghost" onclick={() => { objectionOpen = !objectionOpen; objectionError = ''; }} aria-expanded={objectionOpen}>Bezwaar</Button>
							{/if}
						{/if}
					</div>

					{#if objectionOpen && v.canObject}
						<div class="flex flex-col gap-2 rounded-tile border border-border p-3">
							<p class="text-sm text-text-muted">Vind je dat je uitleg goed was? Je antwoord telt dan als goed en de beheerder kijkt ernaar.</p>
							<label>
								<span class="mb-1 block text-sm font-semibold text-text-muted">Toelichting (mag leeg)</span>
								<textarea class="input min-h-16" bind:value={objectionNote} maxlength="600" placeholder="Bijvoorbeeld: mijn uitleg zegt hetzelfde als de syllabus, maar in andere woorden."></textarea>
							</label>
							<p class="min-h-5 text-sm font-semibold text-rose-edge" role="alert">{objectionError}</p>
							<div class="flex gap-2">
								<Button size="sm" disabled={objectionBusy} onclick={sendObjection}>Verstuur bezwaar</Button>
								<Button size="sm" variant="ghost" onclick={() => (objectionOpen = false)}>Annuleren</Button>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</Card>
	</div>
{/if}
