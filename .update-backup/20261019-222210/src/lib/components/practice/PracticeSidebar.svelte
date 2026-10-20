<script lang="ts">
	import { formatClock } from '../../utils/time';
	import Card from '../ui/Card.svelte';
	import Progressring from '../ui/Progressring.svelte';

	// Side panel next to the practice board on laptop screens: progress, mistakes (learn) or test status, shortcuts.
	type Props = {
		mode: 'learn' | 'test';
		blockNumber: number;
		blockCount: number;
		/** 0..1 */
		progress: number;
		listTitle: string;
		stageLabel: string;
		totals: { correct: number; wrong: number; assisted: number };
		/** Learn mode: rows that went wrong this session (the forms only, never the answers). */
		trouble: { key: string; listTitle: string; prompt: string }[];
		/** Test mode only. */
		test: { timeLeft: number | null; answered: number; blockSize: number; questionsLeft: number } | null;
	};
	let { mode, blockNumber, blockCount, progress, listTitle, stageLabel, totals, trouble, test }: Props = $props();

	const SHORTCUTS = $derived([
		{ keys: ['Enter'], text: 'Volgend vakje. In het laatste vakje: nakijken of inleveren.' },
		{ keys: ['Tab'], text: 'Volgend vakje.' },
		...(mode === 'learn' ? [{ keys: ['Alt', 'H'], text: 'Hint voor het vakje waar je bent.' }] : []),
		{ keys: ['Alt', 'Enter'], text: mode === 'learn' ? 'Nakijken, of naar het volgende blok.' : 'Naar het volgende blok, of inleveren.' }
	]);
</script>

<aside class="flex flex-col gap-4" aria-label="Zijpaneel">
	<Card class="flex items-center gap-4">
		<Progressring value={progress} size={84} stroke={8} label="Voortgang {Math.round(progress * 100)} procent">
			<span class="font-heading text-base font-semibold">{blockNumber}/{blockCount}</span>
		</Progressring>
		<div class="min-w-0">
			<h2 class="font-heading font-semibold">Voortgang</h2>
			<p class="truncate text-sm text-text-muted">{listTitle}</p>
			{#if mode === 'learn'}<p class="truncate text-sm text-text-muted">Stadium: {stageLabel}</p>{/if}
		</div>
	</Card>

	{#if test}
		<Card class="flex flex-col gap-2">
			<h2 class="font-heading font-semibold">Toetsstatus</h2>
			{#if test.timeLeft !== null}
				<p class={['font-heading text-3xl font-semibold tabular-nums', test.timeLeft <= 60 && 'text-flame']}>{formatClock(test.timeLeft)}</p>
				<p class="-mt-1 text-sm text-text-muted">tijd over</p>
			{/if}
			<p class="text-sm">
				<span class="font-semibold">{test.answered} van {test.blockSize}</span> ingevuld in dit blok
			</p>
			<p class="text-sm"><span class="font-semibold">{test.questionsLeft}</span> {test.questionsLeft === 1 ? 'vraag' : 'vragen'} te gaan</p>
		</Card>
		<Card class="flex flex-col gap-1">
			<h2 class="font-heading font-semibold">Fouten</h2>
			<p class="text-sm text-text-muted">Tijdens een toets zie je geen fouten. Na afloop krijg je alles te zien.</p>
		</Card>
	{:else}
		<Card class="flex flex-col gap-3">
			<h2 class="font-heading font-semibold">Deze sessie</h2>
			<div class="grid grid-cols-3 gap-2 text-center">
				<p><span class="block font-heading text-xl font-semibold">{totals.correct}</span><span class="text-xs text-text-muted">goed</span></p>
				<p><span class="block font-heading text-xl font-semibold">{totals.wrong}</span><span class="text-xs text-text-muted">fout</span></p>
				<p><span class="block font-heading text-xl font-semibold">{totals.assisted}</span><span class="text-xs text-text-muted">met hint</span></p>
			</div>
		</Card>
		<Card class="flex flex-col gap-2">
			<h2 class="font-heading font-semibold">Fouten van deze sessie</h2>
			{#if trouble.length === 0}
				<p class="text-sm text-text-muted">Nog geen fouten, goed bezig!</p>
			{:else}
				<ul class="flex max-h-48 flex-col gap-1 overflow-auto text-sm">
					{#each trouble as item (item.key)}
						<li class="flex justify-between gap-2 rounded-md bg-surface-2 px-2.5 py-1.5">
							<span class="min-w-0 truncate font-semibold">{item.prompt}</span>
							<span class="min-w-0 truncate text-text-muted">{item.listTitle}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</Card>
	{/if}

	<Card class="flex flex-col gap-2">
		<h2 class="font-heading font-semibold">Sneltoetsen</h2>
		<dl class="flex flex-col gap-2 text-sm">
			{#each SHORTCUTS as shortcut (shortcut.keys.join('+'))}
				<div>
					<dt class="flex items-center gap-1">
						{#each shortcut.keys as key, i (key)}
							{#if i > 0}<span class="text-text-muted" aria-hidden="true">+</span>{/if}
							<kbd class="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-xs">{key}</kbd>
						{/each}
					</dt>
					<dd class="text-text-muted">{shortcut.text}</dd>
				</div>
			{/each}
		</dl>
	</Card>
</aside>