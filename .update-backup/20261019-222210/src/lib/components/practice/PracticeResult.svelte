<script lang="ts">
	import type { TestResult } from '../../engine/blocks';
	import { formatGrade, PASS_PERCENT } from '../../engine/grading';
	import { formatClock } from '../../utils/time';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Confetti from '../ui/Confetti.svelte';
	import Owl from '../ui/Owl.svelte';
	import Progressring from '../ui/Progressring.svelte';

	type Props = {
		mode: 'learn' | 'test';
		test: TestResult | null;
		/** Learn mode totals over the whole session. */
		totals: { correct: number; wrong: number; assisted: number };
		/** 1.0 to 10.0 (test). */
		grade: number;
		/** Light confetti: a passed test, or a finished learn session. */
		celebrate: boolean;
		durationSeconds: number;
		/** The time limit ran out before the test was handed in. */
		timedOut: boolean;
		showGrade: boolean;
		/** Learn mode: rows that went wrong at least once. */
		troubleCount: number;
		backHref: string;
		/** Same session again. */
		onrestart: () => void;
		/** Back to the start screen (new choices). */
		onchange: () => void;
		/** Only the mistakes (learn) or a retest of the wrong forms (test). */
		onretry: () => void;
	};
	let { mode, test, totals, grade, celebrate, durationSeconds, timedOut, showGrade, troubleCount, backHref, onrestart, onchange, onretry }: Props = $props();

	const percent = $derived(test ? Math.round(test.score * 100) : 100);
	const passed = $derived(celebrate);
</script>

{#if celebrate}<Confetti />{/if}

<div class="mx-auto flex max-w-xl flex-col items-center gap-5 py-8 text-center">
	<Owl pose={celebrate ? 'cheer' : 'happy'} size={96} />

	{#if mode === 'test' && test}
		<Progressring value={test.score} size={140} stroke={12} label="Score {percent} procent" accent={passed ? 'sage' : 'primary'}>
			{#if showGrade}
				<span class="flex flex-col leading-tight">
					<span class="font-heading text-3xl font-semibold">{formatGrade(grade)}</span>
					<span class="text-sm text-text-muted">{percent}%</span>
				</span>
			{:else}
				<span class="font-heading text-3xl font-semibold">{percent}%</span>
			{/if}
		</Progressring>
		<div>
			<h1 class="font-heading text-2xl font-semibold">{passed ? 'Geslaagd!' : 'Nog niet geslaagd'}</h1>
			<p class="text-text-muted">{test.correct} van {test.total} goed · geslaagd vanaf {PASS_PERCENT}%</p>
			{#if durationSeconds > 0}<p class="text-sm text-text-muted">Duur: {formatClock(durationSeconds)}</p>{/if}
		</div>

		{#if timedOut}
			<p class="w-full rounded-tile bg-surface-2 p-3 text-sm font-semibold" role="status">De tijd was om. Wat je nog niet had ingevuld telt als fout.</p>
		{/if}

		{#if test.wrong.length > 0}
			<Card class="w-full text-left">
				<details open>
					<summary class="cursor-pointer font-heading text-lg font-semibold">Fout beantwoord ({test.wrong.length})</summary>
					<ul class="mt-3 flex flex-col gap-3">
						{#each test.wrong as item (item.blockIndex + ':' + item.rowKey)}
							<li class="rounded-tile bg-surface-2 p-3">
								<p class="text-sm text-text-muted">{item.listTitle}</p>
								<p class="font-heading font-semibold">{item.shown}</p>
								<p class="text-sm">
									<span class="text-rose-edge line-through">{item.given.trim() || '(leeg)'}</span>
									<span aria-hidden="true"> → </span>
									<span class="font-semibold text-sage-edge">{item.expected.join(' / ')}</span>
								</p>
							</li>
						{/each}
					</ul>
				</details>
			</Card>
		{/if}
	{:else}
		<div>
			<h1 class="font-heading text-2xl font-semibold">Alles gelukt!</h1>
			<p class="text-text-muted">Je hebt alle blokken goed ingevuld.</p>
		</div>
		<Card class="grid w-full grid-cols-3 gap-3">
			<p><span class="block font-heading text-2xl font-semibold">{totals.correct}</span><span class="text-sm text-text-muted">goed</span></p>
			<p><span class="block font-heading text-2xl font-semibold">{totals.wrong}</span><span class="text-sm text-text-muted">fout</span></p>
			<p><span class="block font-heading text-2xl font-semibold">{totals.assisted}</span><span class="text-sm text-text-muted">met hint</span></p>
		</Card>
	{/if}

	<div class="flex flex-wrap justify-center gap-3">
		{#if mode === 'test' && test && test.wrong.length > 0}
			<Button onclick={onretry}>Alleen fouten opnieuw toetsen</Button>
		{:else if mode === 'learn' && troubleCount > 0}
			<Button onclick={onretry}>Alleen fouten oefenen ({troubleCount})</Button>
		{/if}
		<Button variant={(mode === 'test' && test && test.wrong.length > 0) || (mode === 'learn' && troubleCount > 0) ? 'secondary' : 'primary'} onclick={onrestart}>Opnieuw</Button>
		<Button variant="secondary" onclick={onchange}>Andere instellingen</Button>
		<Button href={backHref} variant="ghost">Terug</Button>
	</div>
</div>