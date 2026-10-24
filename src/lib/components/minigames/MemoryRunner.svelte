<script lang="ts">
	import { untrack } from 'svelte';
	import { playSfx } from '../../audio/sfx';
	import { MemorySession, memoryStars } from '../../engine/memory';
	import { selectRows } from '../../engine/options';
	import type { StudySet } from '../../schema/types';
	import { toasts } from '../../state/toast.svelte';
	import { getStorage } from '../../storage';
	import type { SessionLog } from '../../storage/adapter';
	import { applyDeltas } from '../../storage/progress';
	import { newId } from '../../utils/id';
	import Button from '../ui/Button.svelte';
	import Chip from '../ui/Chip.svelte';
	import Icon from '../ui/Icon.svelte';
	import ProgressBar from '../ui/ProgressBar.svelte';
	import Leaf from './art/Leaf.svelte';
	import Nest from './art/Nest.svelte';
	import type { MemoryConfig } from './config';
	import MemoryResult from './MemoryResult.svelte';

	// Uilen-memory: leaves face down, find the term and its answer. No timer pressure: the game is about remembering where
	// things lie. A mismatch turns back after a moment (or at the next flip); progress counts per pair, see engine/memory.ts.
	type Props = {
		sets: StudySet[];
		config: MemoryConfig;
		title: string;
		/** The set page. */
		backHref: string;
		/** The minigames page of the set. */
		hubHref: string;
		onrestart: (next: MemoryConfig | null) => void;
	};
	let { sets, config, title, backHref, hubHref, onrestart }: Props = $props();

	/** A mismatch stays open this long (long enough to read both leaves) unless the learner flips another card. */
	const MISMATCH_MS = 1400;

	const storage = getStorage();
	// svelte-ignore state_referenced_locally
	const rows = selectRows(sets, config.selection, { strictness: 'set', onlyRowKeys: config.onlyRowKeys });
	const rowByKey = new Map(rows.map((r) => [r.key, r]));
	// svelte-ignore state_referenced_locally
	const session = new MemorySession({ rows, pairs: config.onlyRowKeys ? 99 : config.pairs });
	const sessionId = newId();
	const startedAt = Date.now();
	let endedAt = 0;

	let rev = $state(0);
	const v = $derived.by(() => {
		void rev;
		return { summary: session.summary, finished: session.finished, open: session.open, streak: session.streak, mismatch: session.hasMismatch };
	});
	let message = $state<'start' | 'second' | 'match' | 'mismatch'>('start');
	/** The result shows a moment after the last pair, so the learner sees it open. */
	let done = $state(false);
	let finalized = false;
	let saving: Promise<void> = Promise.resolve();
	let timer: ReturnType<typeof setTimeout> | undefined;
	let doneTimer: ReturnType<typeof setTimeout> | undefined;
	let grid: HTMLElement | undefined = $state();

	/** Columns from the screen width up (3 on a phone). */
	const cols = session.cards.length <= 16 ? 4 : session.cards.length <= 20 ? 5 : 6;

	function save() {
		const deltas = session.drainDeltas();
		if (deltas.length === 0) return;
		const bySet = new Map<string, typeof deltas>();
		for (const d of deltas) bySet.set(d.setId, [...(bySet.get(d.setId) ?? []), d]);
		const s = session.summary;
		const log: SessionLog = {
			id: sessionId,
			mode: 'learn',
			setIds: [...new Set(rows.map((r) => r.setId))],
			startedAt,
			endedAt: Date.now(),
			total: s.moves,
			correct: s.found
		};
		saving = saving.then(async () => {
			try {
				for (const [setId, list] of bySet) await storage.saveProgress(setId, applyDeltas(await storage.getProgress(setId), list));
				await storage.saveSession(log);
			} catch {
				toasts.show('Je voortgang kon niet worden opgeslagen');
			}
		});
	}

	$effect(() => {
		if (!v.finished || finalized) return;
		finalized = true;
		endedAt = Date.now();
		untrack(() => {
			save();
			clearTimeout(timer);
			doneTimer = setTimeout(() => (done = true), 900);
		});
	});

	function flip(id: string) {
		clearTimeout(timer);
		const result = session.flip(id);
		if (!result) return;
		if (result.type === 'first') message = 'second';
		else if (result.type === 'match') {
			message = 'match';
			save();
			if (!session.finished) playSfx('correct');
			else if (session.summary.firstTry === session.summary.pairs) playSfx('pass');
		} else {
			message = 'mismatch';
			timer = setTimeout(() => {
				session.resolveMismatch();
				rev++;
			}, MISMATCH_MS);
		}
		rev++;
	}

	$effect(() => () => {
		clearTimeout(timer);
		clearTimeout(doneTimer);
	});

	/** Arrow keys move between the leaves; Enter and space flip (native button behaviour). */
	function onGridKey(event: KeyboardEvent) {
		const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[event.key];
		if (step === undefined || !grid) return;
		const buttons = [...grid.querySelectorAll<HTMLButtonElement>('button')];
		const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
		if (at === -1) return;
		event.preventDefault();
		buttons[Math.min(buttons.length - 1, Math.max(0, at + step))]?.focus();
	}

	const label = (index: number, text: string, face: boolean, found: boolean) =>
		face ? `Blad ${index + 1}: ${text}${found ? ' (gevonden)' : ''}` : `Blad ${index + 1}, omgekeerd`;

	const trouble = $derived(
		v.finished
			? session.troubleKeys().flatMap((key) => {
					const row = rowByKey.get(key);
					return row ? [{ prompt: row.prompt, answer: row.answers.join(', ') }] : [];
				})
			: []
	);
	function retryTrouble() {
		const keys = session.troubleKeys();
		if (keys.length >= 2) onrestart({ ...config, onlyRowKeys: keys });
	}
</script>

<svelte:head><title>Uilen-memory · {title} · Uiltje</title></svelte:head>

{#if done}
	<MemoryResult
		summary={v.summary}
		stars={memoryStars(v.summary)}
		durationSeconds={Math.round(((endedAt || Date.now()) - startedAt) / 1000)}
		{trouble}
		{backHref}
		{hubHref}
		onrestart={() => onrestart(config)}
		onchange={() => onrestart(null)}
		onretry={trouble.length >= 2 ? retryTrouble : null}
	/>
{:else}
	<div class="mx-auto flex w-full max-w-3xl flex-col gap-3 sm:gap-4">
		<header class="flex items-center gap-3">
			<Button href={hubHref} variant="ghost" size="sm" iconOnly aria-label="Stoppen met Uilen-memory"><Icon name="x" size={20} /></Button>
			<div class="min-w-0 flex-1 text-center">
				<p class="truncate font-heading font-semibold">Uilen-memory</p>
				<p class="truncate text-sm text-text-muted">{title}</p>
			</div>
			<span class="size-9" aria-hidden="true"></span>
		</header>

		<div class="flex min-h-14 items-center gap-3">
			<Nest owls={v.summary.found} size={64} />
			<div class="flex min-w-0 flex-1 flex-col gap-1.5">
				<div class="flex items-baseline justify-between gap-2">
					<p class="font-heading font-semibold">{v.summary.found} van {v.summary.pairs} paren gevonden</p>
					<span class="flex min-h-7 items-center gap-2">
						{#if v.streak >= 2}<Chip active class="gap-1"><Icon name="flame" size={16} /> {v.streak} op rij</Chip>{/if}
						<Chip>{v.summary.moves} {v.summary.moves === 1 ? 'poging' : 'pogingen'}</Chip>
					</span>
				</div>
				<ProgressBar value={v.summary.pairs === 0 ? 0 : v.summary.found / v.summary.pairs} label="Gevonden paren" accent="sage" />
			</div>
		</div>

		<p class="flex min-h-7 items-center justify-center text-center text-base" role="status" aria-live="polite">
			{#if message === 'match'}
				<span class="rounded-full bg-sage-soft px-2.5 py-0.5 font-semibold">Een paar!</span>
			{:else if message === 'mismatch'}
				<span class="font-semibold text-text-muted">Geen paar, onthoud waar ze liggen.</span>
			{:else if message === 'second'}
				<span class="text-text-muted">Kies het blad dat hierbij hoort.</span>
			{:else}
				<span class="text-text-muted">Draai een blad om.</span>
			{/if}
		</p>

		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<ul class="grid" style:--cols={cols} bind:this={grid} onkeydown={onGridKey} aria-label="Bladeren">
			{#each session.cards as card, i (card.id)}
				{@const found = session.isFound(card.id)}
				{@const face = found || v.open.includes(card.id)}
				<li>
					<button
						type="button"
						class="card"
						data-face={face}
						data-found={found}
						data-wrong={v.mismatch && v.open.includes(card.id)}
						aria-label={label(i, card.text, face, found)}
						aria-disabled={found}
						onclick={() => !found && flip(card.id)}
					>
						<span class="inner">
							<span class="side back"><Leaf /></span>
							<span class="side front">
								{#if card.context}<span class="ctx">{card.context}</span>{/if}
								<span class={['txt', card.text.length > 26 ? 'xs' : card.text.length > 14 ? 'sm' : 'md']}>{card.text}</span>
							</span>
						</span>
					</button>
				</li>
			{/each}
		</ul>

		<p class="min-h-6 text-center text-sm text-text-muted">Pijltjes verplaatsen je tussen de bladeren, Enter of spatie draait om.</p>
	</div>
{/if}

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.6rem;
		list-style: none;
		padding: 0;
		margin: 0;
	}
	@media (min-width: 640px) {
		.grid {
			grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
			gap: 0.8rem;
		}
	}
	.card {
		display: block;
		width: 100%;
		aspect-ratio: 5 / 4;
		min-height: 5rem;
		perspective: 700px;
		background: none;
		border: 0;
		padding: 0;
		cursor: pointer;
		border-radius: var(--radius-card);
	}
	.card:focus-visible {
		outline: 3px solid color-mix(in srgb, var(--color-primary) 50%, transparent);
		outline-offset: 3px;
	}
	.card[data-found='true'] {
		cursor: default;
	}
	.inner {
		position: relative;
		display: block;
		width: 100%;
		height: 100%;
		transform-style: preserve-3d;
		transition: transform 0.4s cubic-bezier(0.3, 1.3, 0.5, 1);
	}
	.card[data-face='true'] .inner {
		transform: rotateY(180deg);
	}
	.card:not([data-face='true']):hover .inner {
		transform: translateY(-2px);
	}
	.side {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.15rem;
		padding: 0.4rem 0.5rem;
		border-radius: var(--radius-card);
		border: 1.5px solid var(--color-border);
		box-shadow: var(--shadow-card);
		backface-visibility: hidden;
		text-align: center;
		overflow: hidden;
	}
	.back {
		background: color-mix(in srgb, var(--color-sage) 55%, var(--color-surface));
		border-color: var(--color-sage-edge);
	}
	.front {
		background: var(--color-surface);
		transform: rotateY(180deg);
	}
	/* A found pair stays open: cream like an open leaf, with a green edge and a bit quieter than the leaves in play. */
	.card[data-found='true'] .front {
		border: 2px solid var(--color-sage-edge);
		opacity: 0.8;
	}
	.card[data-wrong='true'] .front {
		border-color: var(--color-primary);
		background: var(--color-primary-soft);
	}
	.ctx {
		font-size: 0.7rem;
		font-weight: 600;
		line-height: 1.1;
		color: var(--color-text-muted);
	}
	.txt {
		font-family: var(--font-heading);
		font-weight: 600;
		line-height: 1.15;
		overflow-wrap: anywhere;
		hyphens: auto;
	}
	.txt.md {
		font-size: 1.2rem;
	}
	.txt.sm {
		font-size: 1rem;
	}
	.txt.xs {
		font-size: 0.8rem;
	}
	/* Reduced motion: no flip, the faces just swap. */
	@media (prefers-reduced-motion: reduce) {
		.inner {
			transition: none;
		}
		.card:not([data-face='true']):hover .inner {
			transform: none;
		}
	}
</style>
