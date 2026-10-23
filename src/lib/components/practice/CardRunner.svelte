<script lang="ts">
	import PracticeSkeleton from '../skeleton/PracticeSkeleton.svelte';
	import { onMount, tick, untrack } from 'svelte';
	import { playSfx } from '../../audio/sfx';
	import { CardSession, markLetters } from '../../engine/cards';
	import { selectRows } from '../../engine/options';
	import type { StudySet } from '../../schema/types';
	import { toasts } from '../../state/toast.svelte';
	import { getStorage } from '../../storage';
	import type { SessionLog } from '../../storage/adapter';
	import { applyDeltas } from '../../storage/progress';
	import { newId } from '../../utils/id';
	import { languageFor, speak } from '../../utils/speech';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Chip from '../ui/Chip.svelte';
	import Confetti from '../ui/Confetti.svelte';
	import Icon from '../ui/Icon.svelte';
	import Owl from '../ui/Owl.svelte';
	import ProgressBar from '../ui/ProgressBar.svelte';
	import { greekKeyboard } from '../../utils/keyboard';
	import { CARD_MODE_INFO, type CardConfig } from './config';
	import { wayLabelFor } from './copy';
	import RowNote from './RowNote.svelte';

	// Flashcards, multiple choice, dictation, spelling and hints: one pass over the selected rows (engine/cards.ts).
	type Props = {
		sets: StudySet[];
		config: CardConfig;
		title: string;
		backHref: string;
		onrestart: (next: CardConfig | null) => void;
	};
	let { sets, config, title, backHref, onrestart }: Props = $props();

	const storage = getStorage();
	// svelte-ignore state_referenced_locally
	const mode = config.mode;
	const info = CARD_MODE_INFO[mode];
	// svelte-ignore state_referenced_locally
	const rows = selectRows(sets, config.selection, { strictness: 'set', onlyRowKeys: config.onlyRowKeys });
	const rowByKey = new Map(rows.map((r) => [r.key, r]));
	// svelte-ignore state_referenced_locally
	const subjectOf = new Map(sets.map((s) => [s.id, s.subject]));
	// svelte-ignore state_referenced_locally
	const session = new CardSession({ rows, mode, direction: config.direction });
	const startedAt = Date.now();
	const sessionId = newId();

	let rev = $state(0);
	const v = $derived.by(() => {
		void rev;
		return { item: session.item, j: session.judgement, index: session.index, total: session.total, finished: session.finished, summary: session.summary };
	});

	let input = $state('');
	let given = $state('');
	let hint = $state('');
	let flipped = $state(false);
	let inputEl: HTMLInputElement | undefined = $state();
	const greek = $derived(rowByKey.get(v.item?.rowKey ?? '')?.settings.keyboard === 'greek');
	let saving: Promise<void> = Promise.resolve();
	let finalized = false;

	const langOf = (rowKey: string) => languageFor(subjectOf.get(rowByKey.get(rowKey)?.setId ?? '') ?? '');
	const sayCurrent = () => {
		const item = session.item;
		if (item?.way === 'dictation') speak(item.speak, langOf(item.rowKey));
	};

	// A fresh card: clear the fields, focus the input, read the word aloud (dictation).
	$effect(() => {
		void v.index;
		untrack(() => {
			input = '';
			given = '';
			hint = '';
			flipped = false;
			void tick().then(() => {
				inputEl?.focus();
				sayCurrent();
			});
		});
	});

	// ---- saving: progress per answer; flashcards are self-rated and leave the progress alone
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
			total: s.total,
			correct: s.correct
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
			if (v.summary.wrong === 0 && v.summary.total > 0) playSfx('pass');
		});
	});

	// ---- actions
	const judged = () => {
		save();
		rev++;
	};
	function choose(index: number) {
		const j = session.answer(index);
		if (!j) return;
		playSfx(j.correct ? 'correct' : 'wrong');
		judged();
	}
	function check() {
		given = input;
		const j = session.answer(input);
		if (!j) return;
		playSfx(j.correct ? 'correct' : 'wrong');
		judged();
	}
	function askHint() {
		const out = session.hint();
		if (out.kind === 'hint') hint = out.text;
		else if (out.kind === 'revealed') {
			given = input;
			playSfx('wrong');
			judged();
		}
	}
	function giveUp() {
		given = input;
		if (!session.giveUp()) return;
		playSfx('wrong');
		judged();
	}
	function next() {
		session.next();
		rev++;
	}
	function rate(known: boolean) {
		playSfx(known ? 'correct' : 'wrong');
		session.rate(known);
		rev++;
	}

	function retryWrong() {
		const keys = session.wrongKeys();
		if (keys.length > 0) onrestart({ ...config, onlyRowKeys: keys });
	}

	function onWindowKey(event: KeyboardEvent) {
		if (event.isComposing || v.finished || event.ctrlKey || event.metaKey || event.altKey) return;
		const item = v.item;
		if (!item) return;
		if (mode === 'choice' && !v.j && /^[1-9]$/.test(event.key)) {
			const index = Number(event.key) - 1;
			if (item.options && index < item.options.length) {
				event.preventDefault();
				choose(index);
			}
		} else if (mode === 'flashcards') {
			if (event.key === ' ' && !flipped && !(event.target instanceof HTMLButtonElement)) {
				event.preventDefault();
				flipped = true;
			} else if (flipped && (event.key === 'ArrowLeft' || event.key === '1')) rate(false);
			else if (flipped && (event.key === 'ArrowRight' || event.key === '2')) rate(true);
		} else if (event.key === 'Enter' && v.j && !(event.target instanceof HTMLButtonElement)) {
			event.preventDefault();
			next();
		}
	}

	onMount(() => () => typeof window !== 'undefined' && window.speechSynthesis?.cancel());

	const percent = $derived(v.summary.total === 0 ? 0 : Math.round((v.summary.correct / v.summary.total) * 100));
	const wayLabel = (way: string, rowKey: string) => (way === 'forward' || way === 'reverse' ? wayLabelFor(way, rowByKey.get(rowKey)?.listKind) : 'Luister en typ');
	const optionState = (i: number) => (!v.j ? '' : i === v.j.correctIndex ? 'border-sage bg-sage-soft' : 'opacity-60');
	const marks = $derived(mode === 'spelling' && v.j && !v.j.correct && v.item ? markLetters(given, v.item.expected) : []);
</script>

<svelte:head><title>{info.name} · {title} · Uiltje</title></svelte:head>
<svelte:window onkeydown={onWindowKey} />

{#if v.finished}
	<div class="mx-auto flex w-full max-w-xl flex-col items-center gap-5 py-10 text-center">
		{#if v.summary.total > 0 && v.summary.wrong === 0}<Confetti />{/if}
		<Owl pose={v.summary.wrong === 0 ? 'cheer' : 'idle'} size={110} />
		<h1 class="font-heading text-3xl font-semibold">{v.summary.total === 0 ? 'Niets om te oefenen' : v.summary.wrong === 0 ? 'Alles goed!' : 'Klaar!'}</h1>
		{#if v.summary.total > 0}
			<Card class="grid w-full grid-cols-3 gap-3 text-center">
				<div><p class="font-heading text-3xl font-bold">{v.summary.correct}</p><p class="text-sm text-text-muted">{mode === 'flashcards' ? 'Geweten' : 'Goed'}</p></div>
				<div><p class="font-heading text-3xl font-bold">{v.summary.wrong}</p><p class="text-sm text-text-muted">{mode === 'flashcards' ? 'Nog niet' : 'Fout'}</p></div>
				<div><p class="font-heading text-3xl font-bold">{percent}%</p><p class="text-sm text-text-muted">{mode === 'flashcards' ? 'Geweten' : 'Nauwkeurig'}</p></div>
			</Card>
			{#if v.summary.assisted > 0}<p class="text-text-muted">{v.summary.assisted} {v.summary.assisted === 1 ? 'antwoord was' : 'antwoorden waren'} goed met een hint.</p>{/if}
		{:else}
			<p class="text-text-muted">Met deze selectie zijn er geen kaarten. Kies andere lijsten.</p>
		{/if}
		<div class="flex flex-wrap justify-center gap-3">
			{#if session.wrongKeys().length > 0}
				<Button size="lg" onclick={retryWrong}>Alleen {mode === 'flashcards' ? 'wat ik nog niet wist' : 'fouten'} oefenen</Button>
			{/if}
			<Button variant="secondary" size="lg" onclick={() => onrestart(config.onlyRowKeys ? { ...config } : config)}>Opnieuw</Button>
			<Button variant="ghost" size="lg" onclick={() => onrestart(null)}>Andere keuze</Button>
			<Button variant="ghost" size="lg" href={backHref}>Klaar</Button>
		</div>
	</div>
{:else if v.item}
	{@const item = v.item}
	<div class="mx-auto flex w-full max-w-3xl flex-col gap-4">
		<div class="flex items-center gap-3">
			<Button href={backHref} variant="ghost" size="sm" iconOnly aria-label="Stoppen met oefenen"><Icon name="x" size={20} /></Button>
			<div class="min-w-0 flex-1 text-center">
				<p class="truncate font-heading font-semibold">{title}</p>
				<p class="truncate text-sm text-text-muted">Kaart {v.index + 1} van {v.total}</p>
			</div>
			<Chip active>{info.name}</Chip>
		</div>
		<ProgressBar value={v.total === 0 ? 0 : v.index / v.total} label="Voortgang" />

		<Card class="flex min-h-120 flex-col gap-5 sm:p-8">
			<p class="text-sm font-semibold tracking-wide text-text-muted uppercase">{wayLabel(item.way, item.rowKey)}{mode === 'choice' ? ' · kies het goede antwoord' : ''}</p>

			{#if mode === 'flashcards'}
				<button
					type="button"
					class="flex min-h-56 w-full flex-col items-center justify-center gap-3 rounded-card border-[1.5px] border-border bg-surface-2 p-6 text-center hover:bg-surface-2/70"
					aria-label={flipped ? 'Kaart omdraaien naar de vraag' : 'Kaart omdraaien naar het antwoord'}
					onclick={() => (flipped = !flipped)}
				>
					<span class={['font-heading font-semibold', (flipped ? item.expected : item.shown).length > 70 ? 'text-xl sm:text-2xl' : 'text-3xl']}>{flipped ? item.expected : item.shown}</span>
					<span class="text-sm text-text-muted">{flipped ? 'Antwoord' : 'Klik of druk op spatie om te draaien'}</span>
				</button>
				<div class="flex flex-wrap items-center gap-3">
					<Button variant="secondary" size="lg" class="min-w-44" disabled={!flipped} onclick={() => rate(false)}><Icon name="x" size={20} /> Nog niet</Button>
					<Button size="lg" class="min-w-44" disabled={!flipped} onclick={() => rate(true)}><Icon name="check" size={20} /> Wist ik</Button>
				</div>
			{:else if mode === 'choice'}
				<p class={['font-heading font-semibold', item.shown.length > 70 ? 'text-xl sm:text-2xl' : 'text-3xl']}>{item.shown}</p>
				<ul class="grid gap-2 sm:grid-cols-2">
					{#each item.options ?? [] as option, i (i)}
						<li>
							<button
								type="button"
								disabled={!!v.j}
								class={['flex w-full items-center gap-3 rounded-tile border-[1.5px] border-border bg-surface px-4 py-3 text-left hover:bg-surface-2 disabled:cursor-default', optionState(i)]}
								onclick={() => choose(i)}
							>
								<span class="grid size-6 shrink-0 place-items-center rounded-md bg-surface-2 text-sm font-semibold">{i + 1}</span>
								<span class="min-w-0">{option}</span>
							</button>
						</li>
					{/each}
				</ul>
			{:else}
				{#if item.way === 'dictation'}
					<div>
						<Button variant="secondary" size="lg" onclick={sayCurrent}><Icon name="speaker" size={22} /> Luister opnieuw</Button>
					</div>
				{:else}
					<p class={['font-heading font-semibold', item.shown.length > 70 ? 'text-xl sm:text-2xl' : 'text-3xl']}>{item.shown}</p>
				{/if}

				{#if !v.j}
					<form class="flex flex-col gap-3" onsubmit={(e) => { e.preventDefault(); check(); }}>
						<input bind:this={inputEl} use:greekKeyboard={greek} bind:value={input} class="input" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Antwoord" placeholder="Typ je antwoord" />
						<p class="min-h-7 font-heading text-lg tracking-widest" aria-live="polite">{hint}</p>
						<div class="flex flex-wrap items-center gap-3">
							<Button size="lg" class="min-w-44" type="submit" disabled={input.trim() === ''}>Nakijken</Button>
							{#if mode === 'hints'}<Button variant="secondary" type="button" onclick={askHint}><Icon name="bulb" size={18} /> Hint</Button>{/if}
							<Button variant="ghost" type="button" onclick={giveUp}>Ik weet het niet</Button>
						</div>
					</form>
				{/if}
			{/if}

			{#if v.j}
				<div class={['flex items-center gap-3 rounded-tile p-3', v.j.correct ? (v.j.assisted ? 'bg-primary-soft' : 'bg-sage-soft') : 'bg-rose-soft']} role="status">
					<Owl pose={v.j.correct ? 'cheer' : 'oops'} size={44} />
					<div class="min-w-0">
						<p class="font-heading font-semibold">
							{v.j.correct ? (v.j.assisted ? 'Goed, met een hint.' : 'Goed zo!') : v.j.revealed ? 'Het antwoord is:' : 'Fout. Het juiste antwoord is:'}
						</p>
						{#if !v.j.correct || mode !== 'choice'}
							{#if marks.length > 0}
								<p class="font-heading text-xl" aria-label={v.j.expected}>
									{#each marks as m, i (i)}<span class={m.ok ? '' : 'rounded-sm bg-rose px-0.5 text-on-accent'}>{m.char}</span>{/each}
								</p>
							{:else}
								<p class="font-heading text-xl">{v.j.expected}</p>
							{/if}
						{/if}
					</div>
				</div>
				{#if !v.j.correct && v.item && mode !== 'flashcards'}<RowNote {sets} rowKey={v.item.rowKey} />{/if}
				<div>
					<!-- svelte-ignore a11y_autofocus -->
					<Button size="lg" class="min-w-44" autofocus onclick={next}>{v.index + 1 === v.total ? 'Afronden' : 'Volgende'}</Button>
				</div>
			{/if}
		</Card>
	</div>
{:else}
	<PracticeSkeleton variant="focus" />
{/if}
