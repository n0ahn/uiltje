<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { playSfx } from '../../audio/sfx';
	import { CatchSession, fallSeconds, starsFor, type CatchJudgement, type CatchWave } from '../../engine/catch';
	import { selectRows } from '../../engine/options';
	import type { StudySet } from '../../schema/types';
	import { toasts } from '../../state/toast.svelte';
	import { getStorage } from '../../storage';
	import type { SessionLog } from '../../storage/adapter';
	import { applyDeltas } from '../../storage/progress';
	import { newId } from '../../utils/id';
	import Button from '../ui/Button.svelte';
	import Chip from '../ui/Chip.svelte';
	import Deco from '../ui/Deco.svelte';
	import Icon from '../ui/Icon.svelte';
	import Owl, { type OwlPose } from '../ui/Owl.svelte';
	import ProgressBar from '../ui/ProgressBar.svelte';
	import Basket from './art/Basket.svelte';
	import Butterfly from './art/Butterfly.svelte';
	import Canopy from './art/Canopy.svelte';
	import Meadow from './art/Meadow.svelte';
	import Nest from './art/Nest.svelte';
	import type { CatchConfig } from './config';
	import UilenvangstResult from './UilenvangstResult.svelte';

	// Uilenvangst: owls drop out of the tree, every owl carries an answer, the basket has to be under the right one.
	// The game is driven by one animation-frame loop (time is counted in JS, so pausing is exact and the game still works
	// with reduced motion, where the owls stay on their branch and a time bar shows how long is left).
	type Props = {
		sets: StudySet[];
		config: CatchConfig;
		title: string;
		/** The set page. */
		backHref: string;
		/** The minigames page of the set. */
		hubHref: string;
		onrestart: (next: CatchConfig | null) => void;
	};
	let { sets, config, title, backHref, hubHref, onrestart }: Props = $props();

	/** The owl lands this long after the choice (the other owls fall with it). */
	const SETTLE_MS = 420;
	/** How long the result of a wave stays on screen; a mistake stays longer so the right answer can be read. */
	const OUTCOME_CAUGHT_MS = 1100;
	const OUTCOME_MISSED_MS = 2400;
	/** Colors of the owls per lane (the first is the normal brown owl). */
	const TONES = ['owl', 'sky', 'sage', 'lilac', 'wheat'] as const;

	const storage = getStorage();
	// svelte-ignore state_referenced_locally
	const rows = selectRows(sets, config.selection, { strictness: 'set', onlyRowKeys: config.onlyRowKeys });
	const rowByKey = new Map(rows.map((r) => [r.key, r]));
	const lanes = typeof window !== 'undefined' && window.innerWidth < 560 ? 3 : 4;
	// svelte-ignore state_referenced_locally
	const session = new CatchSession({ rows, direction: config.direction, lanes, count: config.onlyRowKeys ? null : config.count });
	// svelte-ignore state_referenced_locally
	const speed = config.speed;
	const sessionId = newId();
	const startedAt = Date.now();

	let rev = $state(0);
	const v = $derived.by(() => {
		void rev;
		return { wave: session.wave, summary: session.summary, finished: session.finished, streak: session.streak };
	});

	type Phase = 'falling' | 'landing' | 'outcome';
	let phase = $state<Phase>('falling');
	/** 0 = still on the branch, 1 = landed. */
	let progress = $state(0);
	/** The lane the basket is under (it only catches when the learner drops it: tap, number key, space). */
	let netLane = $state(Math.floor(lanes / 2) - (lanes % 2 === 0 ? 1 : 0));
	let judged = $state<CatchJudgement | null>(null);
	let paused = $state(false);
	let reduced = $state(false);
	/** Changes on every wave, so the owls of a new wave are fresh elements (they pop in again). */
	let waveNo = $state(0);

	// Timing lives outside the reactive state: only `progress` changes every frame.
	let settleLeft = 0;
	let settleFrom = 0;
	let outcomeLeft = 0;
	let playedMs = 0;
	let finalized = false;
	let saving: Promise<void> = Promise.resolve();

	const waveMs = $derived(v.wave ? fallSeconds(speed, v.wave) * 1000 : 10000);
	// With reduced motion the owls stay on their branch while they "fall" (the time bar shows the time) and only land at the end.
	const sceneP = $derived(reduced && phase !== 'outcome' ? 0 : progress);
	const total = $derived(v.summary.total);
	const caught = $derived(v.summary.caught);

	// ---- saving: progress per first fall, like the other practice modes
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
			total: s.waves,
			correct: s.firstTry
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
		untrack(() => {
			save();
			if (v.summary.total > 0 && v.summary.missed === 0) playSfx('pass');
		});
	});

	// ---- the game loop
	function resolve(lane: number | null) {
		if (phase !== 'falling' || paused) return;
		const j = session.answer(lane);
		if (!j) return;
		judged = j;
		save();
		rev++;
		if (lane === null || reduced) {
			progress = 1;
			startOutcome();
		} else {
			phase = 'landing';
			settleFrom = progress;
			settleLeft = SETTLE_MS;
		}
	}

	function startOutcome() {
		phase = 'outcome';
		outcomeLeft = judged?.caught ? OUTCOME_CAUGHT_MS : OUTCOME_MISSED_MS;
		playSfx(judged?.caught ? 'correct' : 'wrong');
		if (judged?.caught && judged.streak > 0 && judged.streak % 5 === 0) playSfx('block');
	}

	function advance() {
		session.next();
		judged = null;
		progress = 0;
		phase = 'falling';
		waveNo++;
		rev++;
	}

	function tick(dt: number) {
		playedMs += dt;
		if (phase === 'falling') {
			progress = Math.min(1, progress + dt / waveMs);
			if (progress >= 1) resolve(null);
		} else if (phase === 'landing') {
			settleLeft -= dt;
			const t = 1 - Math.max(0, settleLeft) / SETTLE_MS;
			progress = settleFrom + (1 - settleFrom) * (t * t);
			if (settleLeft <= 0) {
				progress = 1;
				startOutcome();
			}
		} else {
			outcomeLeft -= dt;
			if (outcomeLeft <= 0) advance();
		}
	}

	onMount(() => {
		reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		let last = performance.now();
		let frame = requestAnimationFrame(function loop(now) {
			frame = requestAnimationFrame(loop);
			const dt = Math.min(64, now - last);
			last = now;
			if (paused || document.hidden || session.finished) return;
			tick(dt);
		});
		// Switching to another tab pauses the game: the owls must not fall while nobody is looking.
		const onHidden = () => {
			if (document.hidden && !session.finished) paused = true;
		};
		document.addEventListener('visibilitychange', onHidden);
		return () => {
			cancelAnimationFrame(frame);
			document.removeEventListener('visibilitychange', onHidden);
		};
	});

	// ---- what the learner does
	/** Move the basket under a lane (mouse hover or arrow keys). Nothing is chosen yet. */
	function moveNet(lane: number) {
		if (phase === 'falling' && !paused) netLane = Math.min(lanes - 1, Math.max(0, lane));
	}
	/** Drop the basket: this owl is the answer. */
	function pick(lane: number) {
		if (phase !== 'falling' || paused) return;
		netLane = lane;
		resolve(lane);
	}
	function onLane(lane: number) {
		if (phase === 'outcome') advance();
		else pick(lane);
	}
	function togglePause() {
		if (!session.finished) paused = !paused;
	}

	function onKey(event: KeyboardEvent) {
		if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey || session.finished) return;
		const onButton = event.target instanceof HTMLButtonElement || event.target instanceof HTMLAnchorElement;
		if (event.key === 'Escape' || event.key === 'p' || event.key === 'P') {
			event.preventDefault();
			togglePause();
			return;
		}
		if (paused) return;
		const wave = session.wave;
		if (/^[1-9]$/.test(event.key)) {
			const lane = Number(event.key) - 1;
			if (wave && lane < wave.options.length) {
				event.preventDefault();
				onLane(lane);
			}
		} else if (event.key === 'ArrowLeft') {
			event.preventDefault();
			moveNet(netLane - 1);
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			moveNet(netLane + 1);
		} else if (event.key === 'ArrowDown' || ((event.key === 'Enter' || event.key === ' ') && !onButton)) {
			event.preventDefault();
			onLane(netLane);
		}
	}

	function retryMissed() {
		const keys = session.wrongKeys();
		if (keys.length > 0) onrestart({ ...config, onlyRowKeys: keys, count: null });
	}

	// ---- wording and looks
	function eyebrow(wave: CatchWave): string {
		const forward = wave.way === 'forward';
		if (wave.kind === 'concept') return forward ? 'Welke term hoort hierbij?' : 'Wat betekent deze term?';
		if (wave.kind === 'vocab') return forward ? 'Vang de vertaling van' : 'Vang het woord bij';
		return forward ? 'Vang de vorm bij' : 'Vang de bepaling van';
	}

	const toneStyle = (lane: number) => {
		const tone = TONES[lane % TONES.length] as string;
		return tone === 'owl' ? undefined : `--color-owl: var(--color-${tone}); --color-owl-dark: color-mix(in srgb, var(--color-${tone}) 70%, #3a2b25)`;
	};

	/** What a lane looks like: while falling all the same, afterwards right / wrong / dimmed. */
	function laneState(lane: number): 'idle' | 'right' | 'wrong' | 'dim' {
		if (!judged) return 'idle';
		if (lane === judged.correctIndex) return 'right';
		return lane === judged.chosen ? 'wrong' : 'dim';
	}

	function owlPose(lane: number): OwlPose {
		if (!judged) return 'cheer';
		if (lane === judged.chosen) return judged.caught ? 'happy' : 'oops';
		return lane === judged.correctIndex ? 'oops' : 'idle';
	}

	const trouble = $derived(
		v.finished
			? session.wrongKeys().flatMap((key) => {
					const row = rowByKey.get(key);
					return row ? [{ prompt: row.prompt, answer: row.answers.join(', ') }] : [];
				})
			: []
	);
	const feedbackRight = $derived(judged && !judged.caught ? judged.expected : '');
</script>

<svelte:head><title>Uilenvangst · {title} · Uiltje</title></svelte:head>
<svelte:window onkeydown={onKey} />

{#if v.finished}
	<UilenvangstResult
		summary={v.summary}
		stars={starsFor(v.summary)}
		durationSeconds={Math.round(playedMs / 1000)}
		{trouble}
		{backHref}
		{hubHref}
		onrestart={() => onrestart(config.onlyRowKeys ? { ...config } : config)}
		onchange={() => onrestart(null)}
		onretry={trouble.length > 0 ? retryMissed : null}
	/>
{:else if v.wave}
	{@const wave = v.wave}
	<div class="mx-auto flex w-full max-w-3xl flex-col gap-3 sm:gap-4">
		<header class="flex items-center gap-3">
			<Button href={hubHref} variant="ghost" size="sm" iconOnly aria-label="Stoppen met Uilenvangst"><Icon name="x" size={20} /></Button>
			<div class="min-w-0 flex-1 text-center">
				<p class="truncate font-heading font-semibold">Uilenvangst</p>
				<p class="truncate text-sm text-text-muted">{title}</p>
			</div>
			<Button variant="secondary" size="sm" iconOnly aria-label={paused ? 'Verder spelen' : 'Pauze'} onclick={togglePause}><Icon name={paused ? 'play' : 'pause'} size={20} /></Button>
		</header>

		<div class="flex min-h-14 items-center gap-3">
			<Nest owls={caught} size={64} />
			<div class="flex min-w-0 flex-1 flex-col gap-1.5">
				<div class="flex items-baseline justify-between gap-2">
					<p class="font-heading font-semibold">{caught} van {total} uilen gevangen</p>
					<span class="min-h-7">
						{#if v.streak >= 2}<Chip active class="gap-1"><Icon name="flame" size={16} /> {v.streak} op rij</Chip>{/if}
					</span>
				</div>
				<ProgressBar value={total === 0 ? 0 : caught / total} label="Gevangen uilen" accent="sage" />
			</div>
		</div>

		<section class="flex min-h-34 flex-col items-center justify-center gap-1 rounded-card border border-border bg-surface px-5 py-4 text-center shadow-card" aria-label="Vraag">
			{#if wave.context}<p class="text-sm font-semibold text-text-muted">{wave.context}</p>{/if}
			<p class="text-sm font-semibold tracking-wide text-text-muted uppercase">{eyebrow(wave)}</p>
			<p class={['font-heading font-semibold', wave.question.length > 70 ? 'text-xl' : wave.question.length > 28 ? 'text-2xl' : 'text-3xl']}>{wave.question}</p>
			<p class="min-h-7 text-base" role="status" aria-live="polite">
				{#if judged?.caught}
					<span class="rounded-full bg-sage-soft px-2.5 py-0.5 font-semibold">{judged.firstTry ? 'Gevangen!' : 'Gevangen, dat was hem!'}</span>
				{:else if judged}
					<span class="font-semibold">{judged.late ? 'Te laat.' : 'Net niet.'} Het antwoord is <span class="rounded-full bg-sage-soft px-2.5 py-0.5">{feedbackRight}</span></span>
				{/if}
			</p>
		</section>

		<div class="min-h-2.5">
			{#if reduced}<ProgressBar value={1 - progress} label="Tijd tot de uilen landen" accent="primary" />{/if}
		</div>

		<div class="scene" style:--lanes={lanes} style:--p={sceneP} data-phase={phase} data-paused={paused} data-reduced={reduced}>
			<Canopy />
			<Meadow />
			<span class="butterfly one"><Butterfly tone="rose" /></span>
			<span class="butterfly two"><Butterfly tone="lilac" size={22} /></span>

			<div class="basket" style:--lane={netLane} data-state={judged ? (judged.caught ? 'caught' : 'missed') : 'idle'}><div class="inner"><Basket part="back" /></div></div>

			<div class="lanes" inert={paused}>
				{#key waveNo}
					{#each wave.options as option, lane (lane)}
						{@const state = laneState(lane)}
						<button
							type="button"
							class="lane"
							style:--i={lane}
							data-active={netLane === lane && phase === 'falling'}
							aria-label="Uil {lane + 1}: {option}"
							onclick={() => onLane(lane)}
							onpointerenter={(event) => event.pointerType === 'mouse' && moveNet(lane)}
							onfocus={() => moveNet(lane)}
						>
							<span class="owl-group" data-leaving={phase === 'outcome' && state === 'dim'}>
								<span class="tag" data-state={state} data-hint={wave.hint && !judged && lane === wave.correctIndex} data-long={option.length > 18}>
									<span class="num" aria-hidden="true">{lane + 1}</span>{option}
								</span>
								<span class="owl" style={toneStyle(lane)}><Owl pose={owlPose(lane)} size={66} /></span>
							</span>
						</button>
					{/each}
				{/key}
			</div>

			<div class="basket front" style:--lane={netLane} data-state={judged ? (judged.caught ? 'caught' : 'missed') : 'idle'}><div class="inner"><Basket part="front" /></div></div>

			{#if phase === 'outcome' && judged?.caught}
				<span class="burst" style:--lane={netLane} aria-hidden="true">
					<span class="spark" style="--dx:-38px; --dy:-26px"><Deco kind="sparkle" size={18} /></span>
					<span class="spark" style="--dx:0px; --dy:-46px"><Deco kind="sparkle" size={24} delay={0.1} /></span>
					<span class="spark" style="--dx:38px; --dy:-24px"><Deco kind="sparkle" size={16} delay={0.2} /></span>
				</span>
			{/if}

			{#if paused}
				<div class="pause" role="dialog" aria-label="Pauze">
					<Owl pose="sleepy" size={84} bob />
					<p class="font-heading text-2xl font-semibold">Pauze</p>
					<Button size="lg" onclick={togglePause}><Icon name="play" size={20} /> Verder spelen</Button>
				</div>
			{/if}
		</div>

		<p class="min-h-6 text-center text-sm text-text-muted">
			{#if phase === 'outcome'}Tik of druk op spatie om door te gaan.{:else}Tik op de uil met het goede antwoord. Toetsenbord: 1–{wave.options.length}, pijltjes en spatie · P = pauze.{/if}
		</p>
	</div>
{/if}

<style>
	/* ------------------------------------------------------------------ the scene
	   One block of scoped CSS on purpose: the positions of owls, basket and ground all depend on each other.
	   --p (0..1) is set once on the scene and inherited, so a frame only touches one style attribute. */
	.scene {
		--perch: 36%;
		--bw: min(9.5rem, calc(100cqw / var(--lanes) - 0.6rem));
		--bh: calc(var(--bw) / 2);
		--land: calc(100% - 0.7rem - var(--bh) * 0.7);
		position: relative;
		container-type: inline-size;
		height: clamp(21rem, calc(100dvh - 25rem), 33rem);
		overflow: hidden;
		border-radius: var(--radius-panel);
		border: 1px solid var(--color-border);
		background: linear-gradient(to bottom, color-mix(in srgb, var(--color-mint) 78%, var(--color-sky)), var(--color-mint) 55%);
		box-shadow: var(--shadow-card);
		user-select: none;
		-webkit-tap-highlight-color: transparent;
	}
	.scene[data-paused='true'] :global(*) {
		animation-play-state: paused !important;
	}

	.butterfly {
		position: absolute;
		pointer-events: none;
		animation: drift 11s ease-in-out infinite alternate;
	}
	.butterfly.one {
		left: 12%;
		top: 52%;
	}
	.butterfly.two {
		left: 70%;
		top: 40%;
		animation-duration: 14s;
		animation-delay: -5s;
	}
	@keyframes drift {
		from {
			transform: translate(0, 0) rotate(-6deg);
		}
		50% {
			transform: translate(26px, -22px) rotate(8deg);
		}
		to {
			transform: translate(-18px, 10px) rotate(-4deg);
		}
	}

	/* ---- owls */
	.lanes {
		position: absolute;
		inset: 0;
	}
	.lane {
		position: absolute;
		inset-block: 0;
		left: calc(var(--i) * 100% / var(--lanes));
		width: calc(100% / var(--lanes));
		display: block;
		padding: 0;
		border: 0;
		background: transparent;
		cursor: pointer;
		border-radius: var(--radius-card);
		transition: background-color 200ms var(--ease-cozy);
	}
	.lane[data-active='true'] {
		background: linear-gradient(to bottom, transparent 30%, color-mix(in srgb, white 28%, transparent));
	}
	.lane:focus-visible {
		outline: 3px solid color-mix(in srgb, var(--color-primary) 55%, transparent);
		outline-offset: -3px;
	}
	.owl-group {
		position: absolute;
		left: 50%;
		/* the bottom of the group (the owl's feet) travels from the branch to the rim of the basket */
		top: calc(var(--perch) + (var(--land) - var(--perch)) * var(--p));
		transform: translate(-50%, -100%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		width: 100%;
		pointer-events: none;
		animation: perch-in 460ms var(--ease-spring) backwards;
		animation-delay: calc(var(--i) * 80ms);
		transition:
			translate 900ms ease-in 300ms,
			opacity 700ms ease-in 400ms;
	}
	.owl-group[data-leaving='true'] {
		translate: 0 -170%;
		opacity: 0;
	}
	.owl,
	.owl :global(svg) {
		display: block;
	}
	.owl {
		margin-bottom: -2px;
		transform-origin: 50% 25%;
	}
	.scene[data-phase='falling'] .owl {
		animation: sway 1.9s ease-in-out infinite;
		animation-delay: calc(var(--i) * -0.45s);
	}
	@keyframes sway {
		0%,
		100% {
			rotate: -6deg;
		}
		50% {
			rotate: 6deg;
		}
	}
	@keyframes perch-in {
		from {
			opacity: 0;
			scale: 0.6;
		}
	}

	/* ---- the answer on a tag, held up by the owl */
	.tag {
		position: relative;
		max-width: calc(100cqw / var(--lanes) - 0.5rem);
		padding: 0.3rem 0.55rem;
		border: 2.5px solid var(--color-ink);
		border-radius: var(--radius-tile);
		background: var(--color-surface);
		color: var(--color-text);
		box-shadow: 0 3px 0 0 var(--color-border);
		font-family: var(--font-body);
		font-size: 0.98rem;
		font-weight: 800;
		line-height: 1.15;
		text-align: center;
		overflow-wrap: anywhere;
		transition:
			background-color 200ms var(--ease-cozy),
			border-color 200ms var(--ease-cozy),
			opacity 300ms var(--ease-cozy);
	}
	.tag[data-long='true'] {
		font-size: 0.86rem;
	}
	.num {
		position: absolute;
		top: -0.65rem;
		left: -0.65rem;
		display: grid;
		place-items: center;
		width: 1.35rem;
		height: 1.35rem;
		border-radius: 999px;
		background: var(--color-ink);
		color: var(--color-surface);
		font-size: 0.75rem;
		line-height: 1;
	}
	.tag[data-state='right'] {
		background: var(--color-sage-soft);
		border-color: var(--color-sage-edge);
	}
	.tag[data-state='wrong'] {
		background: var(--color-rose-soft);
		border-color: var(--color-rose-edge);
	}
	.tag[data-state='dim'] {
		opacity: 0.55;
	}
	.tag[data-hint='true'] {
		animation: hint-glow 1.3s ease-in-out infinite;
	}
	@keyframes hint-glow {
		50% {
			box-shadow:
				0 3px 0 0 var(--color-border),
				0 0 0 7px color-mix(in srgb, var(--color-sage) 65%, transparent);
		}
	}

	/* ---- the basket: two layers, so a caught owl sits inside it */
	.basket {
		position: absolute;
		bottom: 0.7rem;
		left: calc((var(--lane) + 0.5) * 100% / var(--lanes));
		width: var(--bw);
		height: var(--bh);
		translate: -50% 0;
		pointer-events: none;
		transition: left 340ms var(--ease-spring);
	}
	.basket .inner {
		width: 100%;
		height: 100%;
	}
	.basket[data-state='caught'] .inner {
		animation: catch-bounce 520ms var(--ease-spring);
	}
	.basket[data-state='missed'] .inner {
		animation: wiggle 360ms var(--ease-cozy);
	}
	@keyframes catch-bounce {
		30% {
			transform: translateY(6px) scale(1.06, 0.92);
		}
		65% {
			transform: translateY(-5px) scale(0.97, 1.05);
		}
	}

	/* ---- sparkles over the basket after a catch */
	.burst {
		position: absolute;
		bottom: calc(0.7rem + var(--bh));
		left: calc((var(--lane) + 0.5) * 100% / var(--lanes));
		pointer-events: none;
	}
	.spark {
		position: absolute;
		animation: spark-out 900ms var(--ease-cozy) both;
	}
	@keyframes spark-out {
		from {
			transform: translate(0, 0) scale(0.3);
			opacity: 0;
		}
		35% {
			opacity: 1;
		}
		to {
			transform: translate(var(--dx), var(--dy)) scale(1);
			opacity: 0;
		}
	}

	/* ---- pause: covers the tags too, so nobody reads the answers while paused */
	.pause {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		background: color-mix(in srgb, var(--color-bg) 78%, transparent);
		backdrop-filter: blur(8px);
	}
</style>
