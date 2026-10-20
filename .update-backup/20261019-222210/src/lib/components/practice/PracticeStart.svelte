<script lang="ts">
	import { buildBlocks } from '../../engine/blocks';
	import { selectRows } from '../../engine/options';
	import { gradeFromScore, formatGrade } from '../../engine/grading';
	import type { StudySet } from '../../schema/types';
	import { settings } from '../../state/settings.svelte';
	import type { TestRecord } from '../../storage/adapter';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Icon from '../ui/Icon.svelte';
	import OptionGroup from '../ui/OptionGroup.svelte';
	import {
		DIRECTION_OPTIONS,
		MODE_OPTIONS,
		QUESTION_COUNT_CHOICES,
		STEP_BACK_OPTIONS,
		VOCAB_DIRECTION_OPTIONS,
		STRICTNESS_OPTIONS,
		TIME_LIMIT_CHOICES,
		type PracticeConfig,
		type PracticeKind
	} from './config';

	type Props = {
		sets: StudySet[];
		title: string;
		backHref: string;
		onstart: (config: PracticeConfig) => void;
		/** Recent test results for these sets, newest first. */
		results?: TestRecord[];
		/** Which kind of practice opens first (from the menu on the set page). */
		initialMode?: PracticeConfig['mode'];
	};
	let { sets, title, backHref, onstart, results = [], initialMode = 'learn' }: Props = $props();

	// The start screen opens with the defaults from /settings; every choice here only applies to this session.
	// svelte-ignore state_referenced_locally
	const defaults = settings.value.practice;
	// svelte-ignore state_referenced_locally
	const hasWords = sets.some((set) => set.lists.some((l) => l.kind === 'vocab' && l.rows.length > 0));
	// svelte-ignore state_referenced_locally
	const hasForms = sets.some((set) => set.lists.some((l) => l.kind !== 'vocab' && l.rows.length > 0));
	// Words and rijtjes are practised differently, so one session is always one kind.
	let kind = $state<PracticeKind>(hasForms || !hasWords ? 'rijtjes' : 'woorden');
	const usable = (set: StudySet) => set.lists.filter((l) => l.rows.length > 0 && (l.kind === 'vocab') === (kind === 'woorden'));
	const fresh = () => Object.fromEntries(sets.map((set) => [set.id, usable(set).map((l) => l.id)]));
	let selection = $state<Record<string, string[]>>(fresh());
	function setKind(next: PracticeKind) {
		kind = next;
		selection = fresh();
	}
	// svelte-ignore state_referenced_locally
	let mode = $state<PracticeConfig['mode']>(initialMode);
	let direction = $state<PracticeConfig['direction']>(defaults.direction);
	let stepBack = $state<PracticeConfig['stepBack']>(defaults.stepBack);
	let strictness = $state<PracticeConfig['strictness']>(defaults.strictness);
	let questionCount = $state<number | null>(null);
	let timeLimit = $state<number | null>(null);

	const rows = $derived(selectRows(sets, selection, { strictness: 'set', onlyRowKeys: null }));
	const rowCount = $derived(rows.length);
	// A saved choice that no longer fits the selection (fewer forms selected) simply means "all".
	const effectiveCount = $derived(questionCount !== null && questionCount < rowCount ? questionCount : null);
	const questions = $derived((effectiveCount ?? rowCount) * (direction === 'both' ? 2 : 1));
	const blockCount = $derived(mode === 'learn' && kind === 'rijtjes' ? buildBlocks(rows, { direction }).length : 0);
	const countOptions = $derived([
		{ id: null as number | null, name: `Alles (${rowCount})` },
		...QUESTION_COUNT_CHOICES.filter((n) => n < rowCount).map((n) => ({ id: n as number | null, name: `${n} ${kind === 'woorden' ? 'woorden' : 'vormen'}` }))
	]);
	const timeOptions = [
		{ id: null as number | null, name: 'Geen' },
		...TIME_LIMIT_CHOICES.map((m) => ({ id: m as number | null, name: `${m} minuten` }))
	];

	const multiple = $derived(sets.length > 1);
	const selectedTotal = $derived(Object.values(selection).reduce((n, ids) => n + ids.length, 0));
	const everyList = $derived(sets.flatMap((set) => usable(set).map((l) => [set.id, l.id] as const)));
	const allSelected = $derived(everyList.length > 0 && selectedTotal === everyList.length);

	function toggleAll() {
		selection = allSelected ? Object.fromEntries(sets.map((set) => [set.id, []])) : fresh();
	}
	function toggleSet(set: StudySet) {
		const all = usable(set).map((l) => l.id);
		selection[set.id] = (selection[set.id]?.length ?? 0) === all.length ? [] : all;
	}

	function start() {
		onstart({
			kind,
			selection: Object.fromEntries(Object.entries(selection).filter(([, ids]) => ids.length > 0)),
			mode,
			direction,
			stepBack,
			strictness,
			questionCount: mode === 'test' ? effectiveCount : null,
			timeLimitMinutes: mode === 'test' ? timeLimit : null,
			onlyRowKeys: null
		});
	}

	const dateFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' });
</script>

<div class="mx-auto flex max-w-2xl flex-col gap-5">
	<div>
		<h1 class="font-heading text-3xl font-semibold">{title}</h1>
		<p class="text-text-muted">
			{kind === 'woorden' ? 'Kies welke woorden je wilt oefenen. Je leert ze in rondes van 5.' : 'Kies wat je wilt oefenen. Je vult steeds een blok van 5 tot 10 vormen in.'}
		</p>
	</div>

	{#if hasForms && hasWords}
		<OptionGroup
			legend="Wat wil je oefenen?"
			options={[
				{ id: 'rijtjes', name: 'Rijtjes', text: 'Hele rijtjes in blokken invullen.' },
				{ id: 'woorden', name: 'Woorden', text: 'Woordjes leren in rondes.' }
			]}
			value={kind}
			onchange={(v) => setKind(v as PracticeKind)}
		/>
	{/if}

	<Card class="flex flex-col gap-4">
		<div class="flex items-center justify-between">
			<h2 class="font-heading text-lg font-semibold">{kind === 'woorden' ? 'Woorden' : 'Rijtjes'}</h2>
			<button type="button" class="rounded-full px-3 py-1 text-sm font-semibold text-primary-text hover:bg-primary-soft" onclick={toggleAll}>
				{allSelected ? 'Niets selecteren' : 'Alles selecteren'}
			</button>
		</div>
		{#each sets as set (set.id)}
			<div class="flex flex-col gap-1">
				{#if multiple}
					<div class="flex items-center justify-between gap-2">
						<h3 class="min-w-0 truncate font-heading font-semibold">{set.title}</h3>
						<button type="button" class="rounded-full px-3 py-1 text-sm font-semibold text-primary-text hover:bg-primary-soft" onclick={() => toggleSet(set)}>
							Hele set
						</button>
					</div>
				{/if}
				<ul class="flex flex-col gap-1">
					{#each usable(set) as list (list.id)}
						<li>
							<label class="flex cursor-pointer items-center gap-3 rounded-tile px-2 py-2 hover:bg-surface-2">
								<input type="checkbox" class="size-5 accent-primary" value={list.id} bind:group={selection[set.id]} disabled={list.rows.length === 0} />
								<span class="min-w-0 flex-1">
									<span class="block truncate font-semibold">{list.title}</span>
									{#if list.group}<span class="block truncate text-sm text-text-muted">{list.group}</span>{/if}
								</span>
								<span class="text-sm text-text-muted">{list.rows.length} {kind === 'woorden' ? (list.rows.length === 1 ? 'woord' : 'woorden') : list.rows.length === 1 ? 'vorm' : 'vormen'}</span>
							</label>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</Card>

	<Card class="flex flex-col gap-5">
		<OptionGroup legend="Hoe wil je oefenen?" options={MODE_OPTIONS} bind:value={mode} />
		<OptionGroup legend="Richting" options={kind === 'woorden' ? VOCAB_DIRECTION_OPTIONS.map((o) => ({ ...o, text: '' })) : DIRECTION_OPTIONS} bind:value={direction} cols={3} />
	</Card>

	<Card class="flex flex-col gap-5">
		<h2 class="font-heading text-lg font-semibold">Instellingen voor nu</h2>
		<OptionGroup legend="Strengheid" options={STRICTNESS_OPTIONS} bind:value={strictness} cols={3} />
		{#if mode === 'learn' && kind === 'woorden'}
			<p class="text-sm text-text-muted">Woorden die je al kent sla je over. Fout? Dan komt het woord snel terug.</p>
		{:else if mode === 'learn'}
			<OptionGroup legend="Als een blok slecht gaat" options={STEP_BACK_OPTIONS} bind:value={stepBack} cols={3} />
		{:else}
			<OptionGroup legend={kind === 'woorden' ? 'Aantal woorden' : 'Aantal vormen'} options={countOptions} bind:value={questionCount} cols={5} />
			<OptionGroup legend="Tijdslimiet" options={timeOptions} bind:value={timeLimit} cols={3} />
		{/if}
		<p class="text-sm text-text-muted">Je standaardinstellingen pas je aan bij <a class="font-semibold text-primary-text underline" href="/settings">Instellingen</a>.</p>
	</Card>

	{#if results.length > 0}
		<Card class="flex flex-col gap-2">
			<h2 class="font-heading text-lg font-semibold">Laatste toetsen</h2>
			<ul class="flex flex-col gap-1.5">
				{#each results.slice(0, 3) as result (result.id)}
					<li class="flex items-center justify-between gap-3 rounded-tile bg-surface-2 px-3 py-2 text-sm">
						<span class="min-w-0 truncate"><span class="font-semibold">{result.title}</span> · {dateFormat.format(result.takenAt)}</span>
						<span class="shrink-0 font-heading font-semibold">
							{#if settings.value.test.showGrade}{formatGrade(gradeFromScore(result.score))}{:else}{Math.round(result.score * 100)}%{/if}
							<span class="font-normal text-text-muted"> · {result.correct}/{result.total}</span>
						</span>
					</li>
				{/each}
			</ul>
		</Card>
	{/if}

	<div class="flex flex-wrap items-center gap-3">
		<Button size="lg" disabled={rowCount === 0} onclick={start}>
			<Icon name="play" size={20} /> Start
		</Button>
		<Button href={backHref} variant="ghost">Terug</Button>
		<p class="text-sm text-text-muted" aria-live="polite">
			{#if mode === 'learn'}
				{#if kind === 'woorden'}{rowCount} woorden{:else}{rowCount} vormen · {blockCount} {blockCount === 1 ? 'blok' : 'blokken'}{/if}
			{:else}
				{questions} {questions === 1 ? 'vraag' : 'vragen'}{timeLimit ? ` · ${timeLimit} minuten` : ''}
			{/if}
		</p>
	</div>
</div>