<script lang="ts">
	import PracticeSkeleton from '../skeleton/PracticeSkeleton.svelte';
	import { onMount, tick, untrack } from 'svelte';
	import { playSfx } from '../../audio/sfx';
	import { gradeFromScore, isPassed } from '../../engine/grading';
	import { limitRows, selectRows } from '../../engine/options';
	import type { RowProgressDelta } from '../../engine/types';
	import { VocabSession, VocabTest, type Judgement, type VocabDirection } from '../../engine/vocab';
	import type { StudySet } from '../../schema/types';
	import { settings } from '../../state/settings.svelte';
	import { toasts } from '../../state/toast.svelte';
	import { getStorage } from '../../storage';
	import type { SessionLog, TestRecord } from '../../storage/adapter';
	import { applyDeltas } from '../../storage/progress';
	import { newId } from '../../utils/id';
	import { formatClock } from '../../utils/time';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Chip from '../ui/Chip.svelte';
	import Icon from '../ui/Icon.svelte';
	import Owl from '../ui/Owl.svelte';
	import ProgressBar from '../ui/ProgressBar.svelte';
	import { greekKeyboard } from '../../utils/keyboard';
	import type { PracticeConfig } from './config';
	import { wayLabelFor, wordingFor } from './copy';
	import PracticeResult from './PracticeResult.svelte';

	// Vocabulary practice. Learn: rounds of 5 words (look, choose, type, type again). Test: one word at a time.
	type Props = {
		sets: StudySet[];
		config: PracticeConfig;
		title: string;
		backHref: string;
		onrestart: (next: PracticeConfig | null) => void;
	};
	let { sets, config, title, backHref, onrestart }: Props = $props();

	const storage = getStorage();
	// svelte-ignore state_referenced_locally
	const learn = config.mode === 'learn';
	// svelte-ignore state_referenced_locally
	const allRows = selectRows(sets, config.selection, { strictness: config.strictness, onlyRowKeys: config.onlyRowKeys });
	// svelte-ignore state_referenced_locally
	const rows = learn ? allRows : limitRows(allRows, config.questionCount);
	// Words are "vertaald", begrippen (stijlfiguren, grammatica) are not: the wording follows the kind of list.
	// svelte-ignore state_referenced_locally
	const wording = wordingFor(rows.map((r) => r.listKind));
	// svelte-ignore state_referenced_locally
	const kindOf = new Map(rows.map((r) => [r.key, r.listKind]));
	// svelte-ignore state_referenced_locally
	const direction = config.direction as VocabDirection;
	// svelte-ignore state_referenced_locally
	const limitSeconds = !learn && config.timeLimitMinutes ? config.timeLimitMinutes * 60 : null;
	const startedAt = Date.now();
	/** One id for the whole run: every save updates the same entry in the session log (streak, stats). */
	const sessionId = newId();

	let learnSession = $state.raw<VocabSession | null>(null);
	let testSession = $state.raw<VocabTest | null>(null);
	let rev = $state(0);

	onMount(async () => {
		if (!learn) {
			testSession = new VocabTest({ rows, direction });
			return;
		}
		// Words that were already learned (streak of 2) are skipped in the rounds.
		const known = new Set<string>();
		try {
			for (const setId of new Set(rows.map((r) => r.setId))) {
				for (const [key, stats] of Object.entries(await storage.getProgress(setId))) if (stats.streak >= 2) known.add(key);
			}
		} catch {
			/* no progress available: everything counts as new */
		}
		// A retry of the mistakes always practises exactly those words.
		learnSession = new VocabSession({ rows, direction, knownKeys: config.onlyRowKeys ? undefined : known });
	});

	const lv = $derived.by(() => {
		void rev;
		const s = learnSession;
		return s ? { q: s.question, j: s.judgement, p: s.progress, finished: s.finished } : null;
	});
	const tv = $derived.by(() => {
		void rev;
		const t = testSession;
		return t ? { q: t.question, index: t.index, total: t.total, finished: t.finished } : null;
	});
	const finished = $derived(lv?.finished ?? tv?.finished ?? false);

	let input = $state('');
	let retype = $state('');
	let retypeWrong = $state(false);
	let hint = $state('');
	let totals = $state({ correct: 0, wrong: 0, assisted: 0 });
	let outcome = $state<{ celebrate: boolean; grade: number; durationSeconds: number } | null>(null);
	let timedOut = $state(false);
	let saving: Promise<void> = Promise.resolve();
	let finalized = false;
	let inputEl: HTMLInputElement | undefined = $state();
	// Greek keyboard: follows the set of the word that is being asked.
	const keyboardByRow = new Map(rows.map((r) => [r.key, r.settings.keyboard]));
	const greek = $derived(keyboardByRow.get((lv?.q ?? tv?.q)?.rowKey ?? '') === 'greek');

	// Fresh fields for every new question (and focus the field).
	const questionId = $derived(lv?.q ? (lv.q.step === 'intro' ? `intro${lv.q.round}` : `${lv.q.step}:${lv.q.rowKey}:${lv.p.learned}:${lv.p.round}`) : tv ? `t${tv.index}` : '');
	$effect(() => {
		void questionId;
		untrack(() => {
			input = '';
			retype = '';
			retypeWrong = false;
			hint = '';
			void tick().then(() => inputEl?.focus());
		});
	});

	// ---- timer (test)
	let now = $state(Date.now());
	const timeLeft = $derived(limitSeconds === null ? null : Math.max(0, limitSeconds - Math.floor((now - startedAt) / 1000)));
	$effect(() => {
		if (limitSeconds === null || finished) return;
		const id = setInterval(() => (now = Date.now()), 250);
		return () => clearInterval(id);
	});
	$effect(() => {
		if (timeLeft === 0 && !finished) untrack(timeUp);
	});

	// ---- saving
	function save() {
		const deltas = (learnSession ?? testSession)?.drainDeltas() ?? [];
		if (deltas.length === 0) return;
		const bySet = new Map<string, RowProgressDelta[]>();
		for (const d of deltas) {
			totals.correct += d.correct;
			totals.wrong += d.wrong;
			totals.assisted += d.assisted;
			const group = bySet.get(d.setId);
			if (group) group.push(d);
			else bySet.set(d.setId, [d]);
		}
		const log: SessionLog | null = learn
			? {
					id: sessionId,
					mode: 'learn',
					setIds: [...new Set(rows.map((r) => r.setId))],
					startedAt,
					endedAt: Date.now(),
					total: totals.correct + totals.wrong + totals.assisted,
					correct: totals.correct
				}
			: null; // a test is logged by its result record
		saving = saving.then(async () => {
			try {
				for (const [setId, list] of bySet) await storage.saveProgress(setId, applyDeltas(await storage.getProgress(setId), list));
				if (log) await storage.saveSession(log);
			} catch {
				toasts.show('Je voortgang kon niet worden opgeslagen');
			}
		});
	}

	const testResult = $derived(tv?.finished && testSession ? testSession.finish() : null);

	function finalize() {
		if (finalized) return;
		finalized = true;
		save();
		const durationSeconds = Math.min(limitSeconds ?? Infinity, Math.round((Date.now() - startedAt) / 1000));
		if (learn || !testSession) {
			outcome = { celebrate: true, grade: 10, durationSeconds };
			playSfx('pass');
			return;
		}
		const result = testSession.finish();
		const grade = gradeFromScore(result.score);
		const passed = isPassed(result.score);
		outcome = { celebrate: passed, grade, durationSeconds };
		if (passed) playSfx('pass');
		if (result.total === 0) return;
		const record: TestRecord = {
			id: newId(),
			takenAt: Date.now(),
			title,
			setIds: [...new Set(rows.map((r) => r.setId))],
			total: result.total,
			correct: result.correct,
			score: result.score,
			grade,
			passed,
			durationSeconds,
			timedOut,
			wrong: result.wrong.map((i) => ({ rowKey: i.rowKey, listTitle: i.listTitle, shown: i.shown, given: i.given, expected: i.expected }))
		};
		void storage.saveTestResult(record).catch(() => toasts.show('Je toetsresultaat kon niet worden opgeslagen'));
	}

	$effect(() => {
		if (finished) untrack(finalize);
	});

	// ---- learn actions
	function sound(j: Judgement) {
		playSfx(j.correct ? 'correct' : 'wrong');
	}

	function start() {
		learnSession?.continueIntro();
		rev++;
	}

	function choose(index: number) {
		const j = learnSession?.answer(index);
		if (!j) return;
		sound(j);
		rev++;
	}

	function check() {
		const j = learnSession?.answer(input);
		if (!j) return;
		sound(j);
		save();
		rev++;
	}

	function askHint() {
		const out = learnSession?.hint();
		if (!out) return;
		if (out.kind === 'hint') hint = out.hint.text;
		else if (out.kind === 'revealed') {
			playSfx('wrong');
			save();
			rev++;
		}
	}

	function giveUp() {
		const j = learnSession?.giveUp();
		if (!j) return;
		playSfx('wrong');
		save();
		rev++;
	}

	function next() {
		const s = learnSession;
		if (!s) return;
		// After a miss the answer has to be typed once before moving on.
		if (lv?.j && !lv.j.correct && !s.matchesAnswer(retype)) {
			retypeWrong = retype.trim() !== '';
			if (retypeWrong) playSfx('wrong');
			return;
		}
		s.next();
		rev++;
	}

	// ---- test actions
	function submitTest() {
		testSession?.answer(input);
		rev++;
	}

	function timeUp() {
		timedOut = true;
		testSession?.forceFinish();
		rev++;
	}

	function retryWrong() {
		const keys = learnSession ? learnSession.wrongKeys() : (testSession?.wrongKeys() ?? []);
		if (keys.length === 0) return;
		const items = testSession?.finish().wrong ?? [];
		const ways = new Set(items.map((i) => i.way));
		const dir = !learn && ways.size === 1 ? ([...ways][0] as PracticeConfig['direction']) : config.direction;
		onrestart({ ...config, mode: learn ? 'learn' : config.mode, direction: dir, onlyRowKeys: keys, questionCount: null, timeLimitMinutes: null });
	}

	/** 1 to 4 pick a choice; Enter moves on once an answer has been judged. */
	function onWindowKey(event: KeyboardEvent) {
		if (event.isComposing || finished || event.ctrlKey || event.metaKey || event.altKey) return;
		const q = lv?.q;
		if (q?.step === 'choice' && !lv?.j && /^[1-9]$/.test(event.key)) {
			const index = Number(event.key) - 1;
			if (index < q.options.length) {
				event.preventDefault();
				choose(index);
			}
		} else if (event.key === 'Enter' && lv?.j && lv.j.correct && !(event.target instanceof HTMLButtonElement)) {
			event.preventDefault();
			next();
		} else if (event.key === 'Enter' && q?.step === 'intro' && !(event.target instanceof HTMLButtonElement)) {
			event.preventDefault();
			start();
		}
	}

	const progress = $derived(lv ? (lv.p.total === 0 ? 1 : lv.p.learned / lv.p.total) : tv && tv.total > 0 ? tv.index / tv.total : 0);
	const wayLabel = (way: 'forward' | 'reverse', rowKey: string) => wayLabelFor(way, kindOf.get(rowKey));
	const optionState = (i: number) => {
		const j = lv?.j;
		if (!j) return '';
		if (i === j.correctIndex) return 'border-sage bg-sage-soft';
		return 'opacity-60';
	};
</script>

<svelte:head><title>{learn ? 'Leren' : 'Toets'} · {title} · Uiltje</title></svelte:head>
<svelte:window onkeydown={onWindowKey} />

{#if finished}
	<PracticeResult
		mode={config.mode}
		test={testResult}
		{totals}
		grade={outcome?.grade ?? 1}
		celebrate={outcome?.celebrate ?? false}
		durationSeconds={outcome?.durationSeconds ?? 0}
		{timedOut}
		showGrade={settings.value.test.showGrade}
		troubleCount={learn ? (learnSession?.wrongKeys().length ?? 0) : 0}
		{backHref}
		{sets}
		troubleKeys={learn ? (learnSession?.wrongKeys() ?? []) : []}
		onrestart={() => onrestart(config)}
		onchange={() => onrestart(null)}
		onretry={retryWrong}
	/>
{:else if rows.length === 0}
	<p class="py-16 text-center text-text-muted">{wording.empty}</p>
{:else if lv?.q || tv?.q}
	<div class="mx-auto flex w-full max-w-3xl flex-col gap-4">
		<div class="flex items-center gap-3">
			<Button href={backHref} variant="ghost" size="sm" iconOnly aria-label="Stoppen met oefenen"><Icon name="x" size={20} /></Button>
			<div class="min-w-0 flex-1 text-center">
				<p class="truncate font-heading font-semibold">{title}</p>
				{#if lv}
					<p class="truncate text-sm text-text-muted">
						{lv.p.final ? 'Laatste herhaling' : `Ronde ${lv.p.round} van ${lv.p.roundCount}`}
					</p>
				{:else if tv}
					<p class="truncate text-sm text-text-muted">Vraag {Math.min(tv.index + 1, tv.total)} van {tv.total}</p>
				{/if}
			</div>
			{#if timeLeft !== null}
				<span
					role="timer"
					aria-label="Resterende tijd"
					class={[
						'inline-flex h-7 items-center rounded-full border-[1.5px] px-3 font-heading text-sm font-semibold tabular-nums',
						timeLeft <= 60 ? 'border-rose bg-rose-soft text-text' : 'border-transparent bg-surface-2 text-text-muted'
					]}>{formatClock(timeLeft)}</span
				>
			{/if}
			<Chip active>{learn ? 'Leren' : 'Toets'}</Chip>
		</div>

		<div>
			<ProgressBar value={progress} label="Voortgang" />
			{#if lv}
				<p class="mt-1.5 text-sm text-text-muted">{lv.p.learned} van {lv.p.total} {wording.items} geleerd</p>
			{/if}
		</div>

		{#if lv?.q?.step === 'intro'}
			<Card class="flex min-h-120 flex-col gap-5 sm:p-8">
				<div class="flex items-center gap-3">
					<Owl pose="thinking" size={48} />
					<div>
						<h2 class="font-heading text-xl font-semibold">Nieuwe {wording.items}</h2>
						<p class="text-sm text-text-muted">Bekijk ze goed, daarna ga je ze oefenen.</p>
					</div>
				</div>
				<ul class="flex flex-col gap-2">
					{#each lv.q.words as word (word.rowKey)}
						<!-- A long explanation must not push the answer out of the row: the answer keeps its own width. -->
						<li class="flex flex-col gap-2 rounded-tile bg-surface-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
							<span class="min-w-0 flex-1 font-heading font-semibold">{word.prompt}</span>
							<span class="max-w-full shrink-0 self-start rounded-full bg-surface px-3 py-1 text-sm font-semibold sm:max-w-[45%] sm:self-center sm:text-right">{word.answer}</span>
						</li>
					{/each}
				</ul>
				<div><Button size="lg" class="min-w-44" onclick={start}>Start met oefenen</Button></div>
			</Card>
		{:else if lv?.q?.step === 'choice'}
			{@const q = lv.q}
			<Card class="flex min-h-120 flex-col gap-5 sm:p-8">
				<p class="text-sm font-semibold tracking-wide text-text-muted uppercase">{wayLabel(q.way, q.rowKey)} · kies het goede antwoord</p>
				<p class={['font-heading font-semibold', q.shown.length > 70 ? 'text-xl sm:text-2xl' : 'text-3xl']}>{q.shown}</p>
				<ul class="grid gap-2 sm:grid-cols-2">
					{#each q.options as option, i (i)}
						<li>
							<button
								type="button"
								disabled={!!lv.j}
								class={['flex w-full items-center gap-3 rounded-tile border-[1.5px] border-border bg-surface px-4 py-3 text-left hover:bg-surface-2 disabled:cursor-default', optionState(i)]}
								onclick={() => choose(i)}
							>
								<span class="grid size-6 shrink-0 place-items-center rounded-md bg-surface-2 text-sm font-semibold">{i + 1}</span>
								<span class="min-w-0">{option}</span>
							</button>
						</li>
					{/each}
				</ul>
				{#if lv.j}
					<div class={['flex items-center gap-3 rounded-tile p-3', lv.j.correct ? 'bg-sage-soft' : 'bg-rose-soft']} role="status">
						<Owl pose={lv.j.correct ? 'cheer' : 'oops'} size={44} />
						<p class="font-heading font-semibold">{lv.j.correct ? 'Goed zo!' : `Fout. Het juiste antwoord is: ${lv.j.expected}`}</p>
					</div>
					<div>
						<!-- svelte-ignore a11y_autofocus -->
						<Button size="lg" class="min-w-44" autofocus onclick={next}>Volgende</Button>
					</div>
				{/if}
			</Card>
		{:else if lv?.q?.step === 'typed'}
			{@const q = lv.q}
			<Card class="flex min-h-120 flex-col gap-5 sm:p-8">
				<p class="text-sm font-semibold tracking-wide text-text-muted uppercase">{wayLabel(q.way, q.rowKey)} · typ het antwoord</p>
				<p class={['font-heading font-semibold', q.shown.length > 70 ? 'text-xl sm:text-2xl' : 'text-3xl']}>{q.shown}</p>

				{#if !lv.j}
					<form class="flex flex-col gap-3" onsubmit={(e) => { e.preventDefault(); check(); }}>
						<input bind:this={inputEl} use:greekKeyboard={greek} bind:value={input} class="input" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Antwoord" placeholder="Typ je antwoord" />
						{#if hint}<p class="font-heading text-lg tracking-widest" aria-live="polite">{hint}</p>{/if}
						<div class="flex flex-wrap items-center gap-3">
							<Button size="lg" class="min-w-44" type="submit" disabled={input.trim() === ''}>Nakijken</Button>
							<Button variant="secondary" type="button" onclick={askHint}><Icon name="bulb" size={18} /> Hint</Button>
							<Button variant="ghost" type="button" onclick={giveUp}>Ik weet het niet</Button>
						</div>
					</form>
				{:else if lv.j.correct}
					<div class={['flex items-center gap-3 rounded-tile p-3', lv.j.assisted ? 'bg-primary-soft' : 'bg-sage-soft']} role="status">
						<Owl pose="cheer" size={44} />
						<p class="font-heading font-semibold">{lv.j.assisted ? 'Goed, met een hint. Dit komt nog terug.' : 'Goed zo!'}</p>
					</div>
					<p class="text-text-muted">{lv.j.expected}</p>
					<div>
						<!-- svelte-ignore a11y_autofocus -->
						<Button size="lg" class="min-w-44" autofocus onclick={next}>Volgende</Button>
					</div>
				{:else}
					<div class="flex flex-col gap-1 rounded-tile bg-rose-soft p-3" role="status">
						<p class="font-heading font-semibold">{lv.j.revealed ? 'Het antwoord is:' : 'Fout. Het juiste antwoord is:'}</p>
						<p class="font-heading text-xl">{lv.j.expected}</p>
					</div>
					<form class="flex flex-col gap-3" onsubmit={(e) => { e.preventDefault(); next(); }}>
						<label class="flex flex-col gap-1.5">
							<span class="text-sm text-text-muted">Typ het juiste antwoord over om verder te gaan</span>
							<!-- svelte-ignore a11y_autofocus -->
							<input use:greekKeyboard={greek} bind:value={retype} class="input" autofocus autocomplete="off" autocapitalize="off" spellcheck="false" aria-invalid={retypeWrong} />
						</label>
						{#if retypeWrong}<p class="text-sm text-rose-edge" role="alert">Nog niet helemaal. Kijk goed naar het antwoord hierboven.</p>{/if}
						<div><Button size="lg" class="min-w-44" type="submit">Verder</Button></div>
					</form>
				{/if}
			</Card>
		{:else if tv?.q}
			{@const q = tv.q}
			<Card class="flex min-h-120 flex-col gap-5 sm:p-8">
				<p class="text-sm font-semibold tracking-wide text-text-muted uppercase">{wayLabel(q.way, q.rowKey)}</p>
				<p class={['font-heading font-semibold', q.shown.length > 70 ? 'text-xl sm:text-2xl' : 'text-3xl']}>{q.shown}</p>
				<form class="flex flex-col gap-3" onsubmit={(e) => { e.preventDefault(); submitTest(); }}>
					<input bind:this={inputEl} use:greekKeyboard={greek} bind:value={input} class="input" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Antwoord" placeholder="Typ je antwoord" />
					<div class="flex flex-wrap items-center gap-3">
						<Button size="lg" class="min-w-44" type="submit">{tv.index + 1 === tv.total ? 'Inleveren' : 'Volgende'}</Button>
						<p class="text-sm text-text-muted">Leeg laten telt als fout.</p>
					</div>
				</form>
			</Card>
		{/if}
	</div>
{:else}
	<PracticeSkeleton variant="focus" />
{/if}
