<script lang="ts">
	import { buildBlocks } from '../../engine/blocks';
	import { selectRows } from '../../engine/options';
	import { gradeFromScore, formatGrade } from '../../engine/grading';
	import { isWordKind, type StudySet } from '../../schema/types';
	import { settings } from '../../state/settings.svelte';
	import type { TestRecord } from '../../storage/adapter';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Icon from '../ui/Icon.svelte';
	import Segmented from '../ui/Segmented.svelte';
	import {
		CONCEPT_DIRECTION_OPTIONS,
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
	const hasWords = sets.some((set) => set.lists.some((l) => isWordKind(l.kind) && l.rows.length > 0));
	// svelte-ignore state_referenced_locally
	const hasForms = sets.some((set) => set.lists.some((l) => !isWordKind(l.kind) && l.rows.length > 0));
	// Words and rijtjes are practised differently, so one session is always one kind.
	let kind = $state<PracticeKind>(hasForms || !hasWords ? 'rijtjes' : 'woorden');
	const usable = (set: StudySet) => set.lists.filter((l) => l.rows.length > 0 && isWordKind(l.kind) === (kind === 'woorden'));
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
		...TIME_LIMIT_CHOICES.map((m) => ({ id: m as number | null, name: `${m} min` }))
	];

	// When every selected list is a list of begrippen (stijlfiguren, grammatica) the directions read "uitleg → term".
	const onlyConcepts = $derived(
		kind === 'woorden' &&
			sets.every((set) => set.lists.filter((l) => (selection[set.id] ?? []).includes(l.id)).every((l) => l.kind === 'concept')) &&
			selectedCount() > 0
	);
	function selectedCount(): number {
		return Object.values(selection).reduce((n, ids) => n + ids.length, 0);
	}

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

<div class="flex flex-col gap-6">
	<div class="flex flex-wrap items-center gap-3">
		<Button href={backHref} variant="ghost" size="sm" iconOnly aria-label="Terug"><Icon name="arrow-left" size={20} /></Button>
		<div class="min-w-0 flex-1">
			<h1 class="truncate font-heading text-2xl font-semibold sm:text-3xl">{title}</h1>
			<p class="text-text-muted">Kies wat je gaat oefenen en hoe.</p>
		</div>
	</div>

	<div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
		<!-- Left: what to practise. -->
		<div class="flex flex-col gap-6">
			{#if hasForms && hasWords}
				<Segmented
					legend="Wat wil je oefenen?"
					options={[
						{ id: 'rijtjes', name: 'Rijtjes' },
						{ id: 'woorden', name: 'Woorden' }
					]}
					value={kind}
					onchange={(v) => setKind(v as PracticeKind)}
				/>
			{/if}

			<Card class="flex flex-col gap-4">
				<div class="flex items-center justify-between gap-3">
					<h2 class="font-heading text-lg font-semibold">{kind === 'woorden' ? 'Welke woorden en begrippen?' : 'Welke rijtjes?'}</h2>
					<button type="button" class="rounded-full px-3 py-1 text-sm font-semibold text-primary-text hover:bg-primary-soft" onclick={toggleAll}>
						{allSelected ? 'Niets selecteren' : 'Alles selecteren'}
					</button>
				</div>
				{#each sets as set (set.id)}
					<div class="flex flex-col gap-2">
						{#if multiple}
							<div class="flex items-center justify-between gap-2">
								<h3 class="min-w-0 truncate font-heading font-semibold">{set.title}</h3>
								<button type="button" class="rounded-full px-3 py-1 text-sm font-semibold text-primary-text hover:bg-primary-soft" onclick={() => toggleSet(set)}>Hele set</button>
							</div>
						{/if}
						<ul class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
							{#each usable(set) as list (list.id)}
								<li>
									<label class="flex h-full cursor-pointer items-center gap-3 rounded-tile border-2 border-border p-3 hover:bg-surface-2 has-checked:border-primary has-checked:bg-primary-soft">
										<input type="checkbox" class="size-5 shrink-0 accent-primary" value={list.id} bind:group={selection[set.id]} />
										<span class="min-w-0 flex-1">
											<span class="block truncate font-semibold">{list.title}</span>
											<span class="block truncate text-sm text-text-muted">
												{list.rows.length} {kind === 'woorden' ? (list.rows.length === 1 ? 'woord' : 'woorden') : list.rows.length === 1 ? 'vorm' : 'vormen'}{list.group ? ` · ${list.group}` : ''}
											</span>
										</span>
									</label>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
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
		</div>

		<!-- Right: how, with the Start button always in view on a laptop. -->
		<Card class="flex flex-col gap-5 lg:sticky lg:top-6">
			<Segmented legend="Hoe wil je oefenen?" options={MODE_OPTIONS} bind:value={mode} />
			<Segmented
				legend="Richting"
				stack
				options={kind === 'woorden' ? (onlyConcepts ? CONCEPT_DIRECTION_OPTIONS : VOCAB_DIRECTION_OPTIONS) : DIRECTION_OPTIONS.map((o) => ({ id: o.id, name: o.name, text: o.text }))}
				bind:value={direction}
			/>

			<details class="rounded-tile bg-surface-2 px-3 py-2">
				<summary class="cursor-pointer text-sm font-semibold text-text-muted">Meer opties</summary>
				<div class="mt-3 flex flex-col gap-5 pb-2">
					<Segmented legend="Strengheid" stack options={STRICTNESS_OPTIONS} bind:value={strictness} />
					{#if mode === 'learn' && kind === 'rijtjes'}
						<Segmented legend="Als een blok slecht gaat" stack options={STEP_BACK_OPTIONS} bind:value={stepBack} />
					{:else if mode === 'test'}
						<Segmented legend={kind === 'woorden' ? 'Aantal woorden' : 'Aantal vormen'} options={countOptions} bind:value={questionCount} />
						<Segmented legend="Tijdslimiet" options={timeOptions} bind:value={timeLimit} />
					{/if}
					<p class="text-sm text-text-muted">Standaardwaarden pas je aan bij <a class="font-semibold text-primary-text underline" href="/settings">Instellingen</a>.</p>
				</div>
			</details>

			<div class="flex flex-col gap-2">
				<Button size="lg" class="w-full" disabled={rowCount === 0} onclick={start}><Icon name="play" size={20} /> Start</Button>
				<p class="text-center text-sm text-text-muted" aria-live="polite">
					{#if rowCount === 0}
						Kies minstens één {kind === 'woorden' ? 'lijst' : 'rijtje'}.
					{:else if mode === 'learn' && kind === 'woorden'}
						{rowCount} woorden · rondes van 5
					{:else if mode === 'learn'}
						{rowCount} vormen · {blockCount} {blockCount === 1 ? 'blok' : 'blokken'}
					{:else}
						{questions} {questions === 1 ? 'vraag' : 'vragen'}{timeLimit ? ` · ${timeLimit} minuten` : ''}
					{/if}
				</p>
			</div>
		</Card>
	</div>
</div>
