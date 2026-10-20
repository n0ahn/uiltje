<script lang="ts">
	import { untrack } from 'svelte';
	import { playSfx } from '../../audio/sfx';
	import { BlockSession, type CellStatus, type Direction } from '../../engine/blocks';
	import { gradeFromScore, isPassed } from '../../engine/grading';
	import { limitRows, selectRows } from '../../engine/options';
	import type { RowProgressDelta } from '../../engine/types';
	import type { StudySet } from '../../schema/types';
	import { settings } from '../../state/settings.svelte';
	import { toasts } from '../../state/toast.svelte';
	import { getStorage } from '../../storage';
	import type { TestRecord } from '../../storage/adapter';
	import { applyDeltas } from '../../storage/progress';
	import { newId } from '../../utils/id';
	import { formatClock } from '../../utils/time';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Chip from '../ui/Chip.svelte';
	import Icon from '../ui/Icon.svelte';
	import Modal from '../ui/Modal.svelte';
	import Owl from '../ui/Owl.svelte';
	import ProgressBar from '../ui/ProgressBar.svelte';
	import BlockBoard from './BlockBoard.svelte';
	import type { PracticeConfig } from './config';
	import PracticeResult from './PracticeResult.svelte';
	import PracticeSidebar from './PracticeSidebar.svelte';

	type Props = {
		sets: StudySet[];
		config: PracticeConfig;
		/** Name shown in the test history: the set title or the subject. */
		title: string;
		backHref: string;
		/** `null` = back to the start screen; a config = start that session right away (retry of the mistakes). */
		onrestart: (next: PracticeConfig | null) => void;
	};
	let { sets, config, title, backHref, onrestart }: Props = $props();

	const storage = getStorage();
	// The session is built once per run (the page remounts this component with {#key} for a new run).
	// svelte-ignore state_referenced_locally
	const allRows = selectRows(sets, config.selection, { strictness: config.strictness, onlyRowKeys: config.onlyRowKeys });
	// svelte-ignore state_referenced_locally
	const rows = config.mode === 'test' ? limitRows(allRows, config.questionCount) : allRows;
	// svelte-ignore state_referenced_locally
	const session = new BlockSession({ rows, mode: config.mode, direction: config.direction, stepBack: config.stepBack, flat: config.onlyRowKeys !== null });
	// svelte-ignore state_referenced_locally
	const learn = config.mode === 'learn';
	// svelte-ignore state_referenced_locally
	const limitSeconds = !learn && config.timeLimitMinutes ? config.timeLimitMinutes * 60 : null;
	const startedAt = Date.now();

	let rev = $state(0); // the engine is plain TS: bump after every change so the view updates
	const view = $derived.by(() => {
		void rev;
		const block = session.block;
		return {
			block,
			cells: session.cells(),
			index: session.index,
			count: session.blockCount,
			finished: session.finished,
			complete: session.complete,
			notice: session.notice,
			questionsLeft: session.questionTotal - session.questionsDone,
			trouble: session.wrongKeys().flatMap((key) => {
				const label = session.rowLabel(key);
				return label ? [{ key, ...label }] : [];
			}),
			result: session.finished && !learn ? session.finish() : null
		};
	});

	let inputs = $state<Record<string, string>>({});
	let statuses = $state<Record<string, CellStatus>>({});
	let hints = $state<Record<string, string>>({});
	let focused = $state<string | null>(null);
	let totals = $state({ correct: 0, wrong: 0, assisted: 0 });
	let skipped = $state(0);
	let confirmOpen = $state(false);
	let timedOut = $state(false);
	let outcome = $state<{ celebrate: boolean; grade: number; durationSeconds: number } | null>(null);
	let saving: Promise<void> = Promise.resolve();
	let finalized = false;

	// Fresh inputs for every new block (not after every check, so it only depends on the block id).
	const blockId = $derived(view.block?.id ?? null);
	$effect(() => {
		void blockId;
		untrack(() => {
			inputs = Object.fromEntries(view.cells.map((c) => [c.rowKey, '']));
			statuses = {};
			hints = {};
			focused = null;
		});
	});

	// ---- timer (test with a time limit)

	let now = $state(Date.now());
	const timeLeft = $derived(limitSeconds === null ? null : Math.max(0, limitSeconds - Math.floor((now - startedAt) / 1000)));
	const timeNotice = $derived(timeLeft === null ? '' : timeLeft <= 10 ? 'Nog tien seconden' : timeLeft <= 60 ? 'Nog een minuut' : '');
	$effect(() => {
		if (limitSeconds === null || view.finished) return;
		const id = setInterval(() => (now = Date.now()), 250);
		return () => clearInterval(id);
	});
	$effect(() => {
		if (timeLeft === 0 && !view.finished) untrack(timeUp);
	});

	const lastBlock = $derived(view.index === view.count - 1);
	const anyWrong = $derived(Object.values(statuses).includes('wrong'));
	const way = $derived(view.block?.way === 'reverse' ? 'Vorm → bepaling' : 'Bepaling → vorm');
	const done = (status: CellStatus | undefined) => status === 'correct' || status === 'assisted' || status === 'revealed';
	const target = $derived(focused ?? view.cells.find((c) => !done(statuses[c.rowKey]))?.rowKey ?? null);
	const hintLabel = $derived(
		!target ? 'Hint' : session.hintLevel(target) === 0 ? 'Hint: eerste letter' : session.hintLevel(target) === 1 ? 'Hint: patroon' : 'Toon antwoord'
	);
	const progress = $derived(view.count === 0 ? 0 : (view.index + (learn && view.complete ? 1 : 0)) / view.count);
	const answered = $derived(view.cells.length - session.blanks(inputs));

	// ---- saving

	function save() {
		const deltas = session.drainDeltas();
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
		saving = saving.then(async () => {
			try {
				for (const [setId, list] of bySet) await storage.saveProgress(setId, applyDeltas(await storage.getProgress(setId), list));
			} catch {
				toasts.show('Je voortgang kon niet worden opgeslagen');
			}
		});
	}

	/** Runs once when the session is over: saves progress and the test result, plays the finish sound. */
	function finalize() {
		if (finalized) return;
		finalized = true;
		save();
		const durationSeconds = Math.min(limitSeconds ?? Infinity, Math.round((Date.now() - startedAt) / 1000));
		if (learn) {
			outcome = { celebrate: true, grade: 10, durationSeconds };
			playSfx('pass');
			return;
		}
		const result = session.finish();
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

	// ---- actions

	function check() {
		if (!learn) return;
		if (session.complete) return next();
		const before = { ...statuses };
		const out = session.check(inputs);
		statuses = out.statuses;
		for (const [key, status] of Object.entries(out.statuses)) if (status === 'correct' || status === 'assisted') delete hints[key];
		rev++;
		const gained = Object.entries(out.statuses).some(([key, status]) => (status === 'correct' || status === 'assisted') && !done(before[key]));
		const missed = Object.entries(out.statuses).some(([key, status]) => status === 'wrong' && before[key] !== 'wrong');
		if (out.complete) {
			save();
			playSfx('block');
		} else if (missed) playSfx('wrong');
		else if (gained) playSfx('correct');
	}

	function hint() {
		if (!learn || !target) return;
		const out = session.hint(target);
		if (out.kind === 'hint') hints[target] = out.hint.text;
		else if (out.kind === 'revealed') {
			inputs[target] = out.answer;
			statuses[target] = 'revealed';
			delete hints[target];
			rev++;
			if (session.complete) {
				save();
				playSfx('block');
			}
		}
	}

	function next() {
		if (!learn) {
			const blanks = session.blanks(inputs);
			if (lastBlock && skipped + blanks > 0 && !confirmOpen) {
				confirmOpen = true;
				return;
			}
			skipped += blanks;
			confirmOpen = false;
		}
		session.advance(inputs);
		rev++;
		if (session.finished) finalize();
		else if (learn) save();
	}

	function timeUp() {
		timedOut = true;
		confirmOpen = false;
		session.forceFinish(inputs);
		rev++;
		finalize();
	}

	function submit() {
		if (learn) check();
		else next();
	}

	/** Alt + Enter: the main button. Alt + H: a hint. Plain Enter and Tab are handled by the board. */
	function onWindowKey(event: KeyboardEvent) {
		if (event.isComposing || view.finished || confirmOpen || !event.altKey || event.ctrlKey || event.metaKey) return;
		if (event.key === 'Enter') {
			event.preventDefault();
			submit();
		} else if (event.code === 'KeyH' && learn && !view.complete) {
			event.preventDefault();
			hint();
		}
	}

	/** Practise only the rows that went wrong (learn) or were wrong in the test (herkansing). */
	function retryWrong() {
		if (learn) {
			const keys = session.wrongKeys();
			if (keys.length > 0) onrestart({ ...config, onlyRowKeys: keys });
			return;
		}
		const result = view.result;
		if (!result || result.wrong.length === 0) return;
		const ways = new Set(result.wrong.map((item) => item.way));
		const direction: Direction = ways.size === 1 ? ([...ways][0] as Direction) : 'both';
		onrestart({ ...config, direction, onlyRowKeys: [...new Set(result.wrong.map((item) => item.rowKey))], questionCount: null, timeLimitMinutes: null });
	}
</script>

<svelte:head><title>Oefenen · {title} · Uiltje</title></svelte:head>
<svelte:window onkeydown={onWindowKey} />

{#if view.finished}
	<PracticeResult
		mode={config.mode}
		test={view.result}
		{totals}
		grade={outcome?.grade ?? 1}
		celebrate={outcome?.celebrate ?? false}
		durationSeconds={outcome?.durationSeconds ?? 0}
		{timedOut}
		showGrade={settings.value.test.showGrade}
		troubleCount={learn ? session.wrongKeys().length : 0}
		{backHref}
		onrestart={() => onrestart(config)}
		onchange={() => onrestart(null)}
		onretry={retryWrong}
	/>
{:else if view.block}
	<div class="mx-auto flex w-full max-w-5xl items-start gap-6">
		<div class="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-4 lg:mx-0 lg:flex-1">
			<div class="flex items-center gap-3">
				<Button href={backHref} variant="ghost" size="sm" iconOnly aria-label="Stoppen met oefenen"><Icon name="x" size={20} /></Button>
				<div class="min-w-0 flex-1 text-center">
					<p class="truncate font-heading font-semibold">{view.block.listTitle}</p>
					<p class="truncate text-sm text-text-muted">{view.block.label}{view.block.part ? ` · deel ${view.block.part.index} van ${view.block.part.count}` : ''}</p>
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
			<p class="sr-only" aria-live="polite">{timeNotice}</p>

			<div>
				<ProgressBar value={progress} label="Voortgang" />
				<p class="mt-1.5 flex justify-between text-sm text-text-muted">
					<span>Blok {view.index + 1} van {view.count}{view.block.review ? (view.block.review === 'stage' ? ' · herhaling' : ' · extra oefening') : ''}</span>
					<span>{way}</span>
				</p>
			</div>

			{#if view.notice}
				<div class="flex items-center gap-3 rounded-tile bg-primary-soft p-3" role="status">
					<Owl pose="thinking" size={40} />
					<p class="text-sm font-semibold">{view.notice}</p>
				</div>
			{/if}

			<Card class="flex flex-col gap-5 sm:p-8">
				<BlockBoard
					blockId={view.block.id}
					cells={view.cells}
					bind:inputs
					{statuses}
					{hints}
					feedback={learn}
					bind:focused
					onsubmit={submit}
				/>

				{#if learn && view.complete}
					<div class="flex items-center gap-3 rounded-tile bg-sage-soft p-3" role="status">
						<Owl pose="cheer" size={48} />
						<p class="font-heading font-semibold">Blok voltooid!</p>
					</div>
				{/if}

				<div class="flex flex-wrap items-center gap-3">
					{#if learn}
						{#if view.complete}
							<!-- svelte-ignore a11y_autofocus -->
							<Button size="lg" onclick={next} autofocus aria-keyshortcuts="Alt+Enter">{lastBlock ? 'Afronden' : 'Volgende blok'}</Button>
						{:else}
							<Button size="lg" onclick={check} aria-keyshortcuts="Alt+Enter">Nakijken</Button>
							<Button variant="secondary" onclick={hint} aria-keyshortcuts="Alt+H"><Icon name="tag" size={18} /> {hintLabel}</Button>
						{/if}
					{:else}
						<Button size="lg" onclick={next} aria-keyshortcuts="Alt+Enter">{lastBlock ? 'Inleveren' : 'Volgende blok'}</Button>
					{/if}
				</div>
			</Card>

			{#if learn && !view.complete}
				<div class="flex items-center gap-3 text-sm text-text-muted">
					<Owl pose={anyWrong ? 'oops' : 'thinking'} size={40} />
					<p>{anyWrong ? 'Bijna! Pas de rode vakjes aan en kijk opnieuw na.' : 'Vul het hele blok in en kijk na. Tab of Enter gaat naar het volgende vakje.'}</p>
				</div>
			{/if}
		</div>

		<div class="sticky top-6 hidden w-72 shrink-0 lg:block">
			<PracticeSidebar
				mode={config.mode}
				blockNumber={view.index + 1}
				blockCount={view.count}
				{progress}
				listTitle={view.block.listTitle}
				stageLabel={view.block.label}
				{totals}
				trouble={view.trouble}
				test={learn ? null : { timeLeft, answered, blockSize: view.cells.length, questionsLeft: view.questionsLeft }}
			/>
		</div>
	</div>

	<Modal bind:open={confirmOpen} title="Nog lege vakjes">
		<p>Je hebt {skipped + session.blanks(inputs)} {skipped + session.blanks(inputs) === 1 ? 'vakje' : 'vakjes'} leeg gelaten. Die tellen als fout. Toch inleveren?</p>
		{#snippet actions()}
			<Button variant="ghost" onclick={() => (confirmOpen = false)}>Terug</Button>
			<Button onclick={next}>Inleveren</Button>
		{/snippet}
	</Modal>
{/if}