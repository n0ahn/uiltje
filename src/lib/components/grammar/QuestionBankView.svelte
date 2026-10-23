<script lang="ts">
	import { untrack } from 'svelte';
	import { CATALOGUES } from '../../grammar/catalogues';
	import { PICKER_GROUPS, refOf, sectionsFor, type PickerGroupId } from '../../grammar/picker';
	import { createQuestionsApi } from '../../grammar/questions';
	import { requestGenerate } from '../../grammar/questions-client';
	import { allowedKinds, MAX_REFS_PER_REQUEST, type BankQuestion, type QuestionStatus } from '../../grammar/questions-core';
	import { describe } from '../../grammar/rows';
	import type { GrammarCatalogue } from '../../grammar/types';
	import { admin } from '../../state/admin.svelte';
	import { auth } from '../../state/auth.svelte';
	import { toasts } from '../../state/toast.svelte';
	import { StorageError } from '../../storage/adapter';
	import QuestionBankSkeleton from '../skeleton/QuestionBankSkeleton.svelte';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Icon from '../ui/Icon.svelte';
	import Owl from '../ui/Owl.svelte';
	import Segmented from '../ui/Segmented.svelte';

	// Question bank, owner only: let the AI write questions around items of the syllabus, look at what the check pass
	// said, and approve what is good. Approved questions are offered to everyone when they pick items.
	const CATALOGUE_CHOICES = CATALOGUES.map((c) => ({ id: c.id, name: c.subject }));
	const GROUP_CHOICES = PICKER_GROUPS.map((g) => ({ id: g.id, name: g.name }));
	const COUNT_CHOICES = [3, 5, 6].map((n) => ({ id: n, name: `${n} vragen` }));
	const FILTERS = [
		{ id: 'draft' as const, name: 'Te beoordelen' },
		{ id: 'approved' as const, name: 'Goedgekeurd' },
		{ id: 'rejected' as const, name: 'Afgewezen' }
	];

	let catalogueId = $state<GrammarCatalogue['id']>(CATALOGUES[0]!.id);
	let group = $state<PickerGroupId>('stijl');
	let perItem = $state(5);
	let filter = $state<QuestionStatus>('draft');
	let loading = $state(true);
	let failed = $state('');
	let bank = $state<BankQuestion[]>([]);
	let activeRef = $state<string | null>(null);
	let picked = $state<string[]>([]);
	let running = $state(false);
	let progress = $state('');
	let log = $state<string[]>([]);
	let abort: AbortController | null = null;
	let busy = $state(false);
	let editingId = $state<string | null>(null);
	let editForm = $state({ prompt: '', translation: '', explanation: '' });
	let editError = $state('');

	const catalogue = $derived(CATALOGUES.find((c) => c.id === catalogueId) ?? CATALOGUES[0]!);
	const sections = $derived(sectionsFor(catalogue, group));
	const byRef = $derived.by(() => {
		const map = new Map<string, BankQuestion[]>();
		for (const q of bank) map.set(q.ref, [...(map.get(q.ref) ?? []), q]);
		return map;
	});
	const active = $derived.by(() => {
		for (const section of sections) {
			const item = section.items.find((it) => refOf(catalogue, it) === activeRef);
			if (item) return { section, item };
		}
		return null;
	});
	const activeQuestions = $derived((activeRef ? byRef.get(activeRef) ?? [] : []).filter((q) => q.status === filter));
	const countOf = (ref: string, status: QuestionStatus) => (byRef.get(ref) ?? []).filter((q) => q.status === status).length;
	const withoutQuestions = $derived(sections.flatMap((s) => s.items).map((it) => refOf(catalogue, it)).filter((ref) => (byRef.get(ref) ?? []).every((q) => q.status === 'rejected')));

	async function load() {
		const client = auth.client;
		if (!client) return;
		loading = true;
		failed = '';
		try {
			bank = await createQuestionsApi(client).listForCatalogue(catalogueId);
		} catch (error) {
			failed = error instanceof StorageError ? error.message : 'Laden is mislukt.';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		void admin.refresh();
	});

	// Loads again when the owner is known or another catalogue is chosen.
	$effect(() => {
		void catalogueId;
		if (auth.client && admin.isAdmin) untrack(() => void load());
		else loading = false;
	});

	function togglePick(ref: string) {
		picked = picked.includes(ref) ? picked.filter((r) => r !== ref) : [...picked, ref];
	}

	async function generate(refs: string[]) {
		const client = auth.client;
		const user = auth.user;
		if (!client || !user || refs.length === 0 || running) return;
		running = true;
		log = [];
		abort = new AbortController();
		const api = createQuestionsApi(client);
		let made = 0;
		try {
			for (let i = 0; i < refs.length; i += MAX_REFS_PER_REQUEST - 1) {
				const batch = refs.slice(i, i + MAX_REFS_PER_REQUEST - 1);
				progress = `Onderdeel ${i + 1} t/m ${i + batch.length} van ${refs.length}: AI schrijft en controleert…`;
				const result = await requestGenerate(batch, perItem, abort.signal);
				if (!result.ok) {
					log = [...log, result.message];
					break;
				}
				const saved = await api.saveDrafts(user.id, result.drafts, result.model);
				bank = [...bank, ...saved];
				made += saved.length;
				for (const s of result.skipped) log = [...log, `${s.ref.split('/')[1] ?? s.ref}: ${s.reason}`];
				if (!result.checked && saved.length > 0) log = [...log, 'De controle lukte niet voor een deel van de vragen: die staan als "niet gecontroleerd".'];
			}
		} catch (error) {
			log = [...log, error instanceof StorageError ? error.message : 'Bewaren is mislukt.'];
		} finally {
			running = false;
			progress = '';
			abort = null;
			toasts.show(made > 0 ? `${made} nieuwe vragen om te beoordelen` : 'Er zijn geen nieuwe vragen gemaakt');
			if (made > 0) filter = 'draft';
		}
	}

	async function setStatus(ids: string[], status: QuestionStatus) {
		const client = auth.client;
		const user = auth.user;
		if (!client || !user || busy) return;
		busy = true;
		try {
			await createQuestionsApi(client).setStatus(user.id, ids, status);
			bank = bank.map((q) => (ids.includes(q.id) ? { ...q, status } : q));
		} catch (error) {
			toasts.show(error instanceof StorageError ? error.message : 'Dat lukte niet');
		} finally {
			busy = false;
		}
	}

	async function remove(id: string) {
		const client = auth.client;
		if (!client || busy) return;
		busy = true;
		try {
			await createQuestionsApi(client).remove([id]);
			bank = bank.filter((q) => q.id !== id);
		} catch (error) {
			toasts.show(error instanceof StorageError ? error.message : 'Verwijderen is mislukt');
		} finally {
			busy = false;
		}
	}

	function startEdit(q: BankQuestion) {
		editingId = q.id;
		editForm = { prompt: q.prompt, translation: q.translation, explanation: q.explanation };
		editError = '';
	}

	async function saveEdit(q: BankQuestion) {
		const client = auth.client;
		if (!client || busy) return;
		busy = true;
		try {
			await createQuestionsApi(client).edit(q.id, q.kind, editForm);
			bank = bank.map((x) => (x.id === q.id ? { ...x, ...editForm, status: 'draft', checkOk: null, checkNote: 'Bewerkt: niet opnieuw gecontroleerd.' } : x));
			editingId = null;
			filter = 'draft';
		} catch (error) {
			editError = error instanceof StorageError ? error.message : 'Bewaren is mislukt.';
		} finally {
			busy = false;
		}
	}

	const approveAllOk = () => setStatus(activeQuestions.filter((q) => q.checkOk === true).map((q) => q.id), 'approved');
	const okCount = $derived(activeQuestions.filter((q) => q.checkOk === true).length);
</script>

<svelte:head><title>Vragenbank · Uiltje</title></svelte:head>

<div class="mx-auto flex max-w-6xl flex-col gap-5">
	<div class="flex flex-wrap items-center gap-4">
		<Owl pose="thinking" size={64} />
		<div class="min-w-0 flex-1">
			<h1 class="font-heading text-3xl font-semibold">Vragenbank</h1>
			<p class="text-text-muted">De AI bedenkt vragen rond de syllabus, jij keurt ze goed. Het antwoord is altijd de term uit de syllabus.</p>
		</div>
	</div>

	{#if !auth.user}
		<Card class="flex flex-col items-start gap-3">
			<p class="text-text-muted">Log in als beheerder om de vragenbank te gebruiken.</p>
			<Button href="/login?next=/vragen"><Icon name="log-in" size={18} /> Inloggen</Button>
		</Card>
	{:else if !admin.isAdmin}
		<Card class="text-text-muted">Alleen de beheerder kan de vragenbank gebruiken. Ben jij dat? Controleer of je in <code>app_admins</code> staat (zie SQL 004).</Card>
	{:else}
		<div class="grid gap-4 md:grid-cols-2">
			<Segmented legend="Vak" options={CATALOGUE_CHOICES} bind:value={catalogueId} />
			<Segmented legend="Soort onderdelen" options={GROUP_CHOICES} bind:value={group} />
		</div>

		<Card class="flex flex-col gap-3">
			<div class="grid items-end gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
				<Segmented legend="Hoeveel vragen per onderdeel?" options={COUNT_CHOICES} bind:value={perItem} />
				<div class="flex flex-wrap gap-2">
					<Button variant="secondary" disabled={running || picked.length === 0} onclick={() => generate(picked)}><Icon name="sparkles" size={18} /> Aangevinkte ({picked.length})</Button>
					<Button disabled={running || withoutQuestions.length === 0} onclick={() => generate(withoutQuestions)}><Icon name="sparkles" size={18} /> Alles zonder vragen ({withoutQuestions.length})</Button>
					{#if running}<Button variant="ghost" onclick={() => abort?.abort()}>Stoppen</Button>{/if}
				</div>
			</div>
			<p class="min-h-6 text-sm text-text-muted" role="status" aria-live="polite">{progress}</p>
			{#if log.length > 0}
				<ul class="list-disc pl-5 text-sm text-rose-edge" role="alert">{#each log as line, i (i)}<li>{line}</li>{/each}</ul>
			{/if}
			<p class="text-sm text-text-muted">Elk onderdeel kost twee AI-verzoeken (schrijven en controleren), samen per 3 onderdelen. De AI-limiet is klein: maak er per keer niet te veel.</p>
		</Card>

		{#if loading}
			<QuestionBankSkeleton />
		{:else if failed}
			<Card class="flex flex-col items-start gap-3" role="alert">
				<p class="font-semibold text-rose-edge">{failed}</p>
				<p class="text-sm text-text-muted">Heb je <code>ai/sql/006_grammar_questions.sql</code> al gedraaid?</p>
				<Button variant="secondary" onclick={load}>Opnieuw proberen</Button>
			</Card>
		{:else}
			<div class="grid items-start gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
				<Card class="flex max-h-[70vh] flex-col gap-3 overflow-y-auto">
					{#each sections as section (section.id)}
						<div class="flex flex-col gap-1.5">
							<p class="px-1 text-sm font-semibold text-text-muted">{section.title}</p>
							{#each section.items as item (item.id)}
								{@const ref = refOf(catalogue, item)}
								<div class={['flex items-center gap-2 rounded-tile border-2 px-2 py-1.5', activeRef === ref ? 'border-primary bg-primary-soft' : 'border-border']}>
									<input type="checkbox" class="size-5 shrink-0 accent-primary" checked={picked.includes(ref)} onchange={() => togglePick(ref)} aria-label="{item.term} aanvinken" />
									<button type="button" class="min-w-0 flex-1 text-left" onclick={() => (activeRef = ref)}>
										<span class="block truncate font-semibold">{item.term}</span>
										<span class="block text-xs text-text-muted">{allowedKinds(section, item).length === 1 ? 'alleen uitleg' : 'zin + uitleg'}</span>
									</button>
									<span class="shrink-0 text-xs font-semibold text-text-muted" title="goedgekeurd / te beoordelen">{countOf(ref, 'approved')} ✓ · {countOf(ref, 'draft')}</span>
								</div>
							{/each}
						</div>
					{/each}
				</Card>

				<Card class="flex flex-col gap-4">
					{#if !active}
						<p class="py-10 text-center text-text-muted">Kies links een onderdeel om de vragen te zien, of vink onderdelen aan en laat de AI vragen maken.</p>
					{:else}
						<div>
							<h2 class="font-heading text-2xl font-semibold">{active.item.term}</h2>
							<p class="text-text-muted">{describe(active.item)}</p>
							<p class="mt-1 text-sm font-semibold">Antwoord bij elke vraag: <span class="rounded-full bg-surface-2 px-2.5 py-0.5">{active.item.term}</span></p>
						</div>
						<div class="flex flex-wrap items-end justify-between gap-3">
							<Segmented legend="Welke vragen?" options={FILTERS.map((f) => ({ id: f.id, name: `${f.name} (${countOf(activeRef ?? '', f.id)})` }))} bind:value={filter} />
							<div class="flex gap-2">
								<Button size="sm" variant="secondary" disabled={running} onclick={() => generate([activeRef ?? ''])}><Icon name="sparkles" size={16} /> Maak {perItem} vragen</Button>
								{#if filter === 'draft' && okCount > 0}<Button size="sm" disabled={busy} onclick={approveAllOk}><Icon name="check" size={16} /> Keur {okCount} gecontroleerde goed</Button>{/if}
							</div>
						</div>

						{#each activeQuestions as q (q.id)}
							<div class="flex flex-col gap-2 rounded-card border border-border p-3">
								{#if editingId === q.id}
									<label>
										<span class="mb-1 block text-sm font-semibold text-text-muted">{q.kind === 'sentence' ? 'Zin' : 'Beschrijving'}</span>
										<textarea class="input min-h-16" bind:value={editForm.prompt} spellcheck="false"></textarea>
									</label>
									{#if q.kind === 'sentence'}
										<label>
											<span class="mb-1 block text-sm font-semibold text-text-muted">Vertaling</span>
											<input class="input" bind:value={editForm.translation} />
										</label>
									{/if}
									<label>
										<span class="mb-1 block text-sm font-semibold text-text-muted">Uitleg waarom dit klopt</span>
										<input class="input" bind:value={editForm.explanation} />
									</label>
									<p class="min-h-5 text-sm font-semibold text-rose-edge" role="alert">{editError}</p>
									<div class="flex gap-2">
										<Button size="sm" disabled={busy} onclick={() => saveEdit(q)}>Opslaan</Button>
										<Button size="sm" variant="ghost" onclick={() => (editingId = null)}>Annuleren</Button>
									</div>
								{:else}
									<p class="text-xs font-semibold tracking-wide text-text-muted uppercase">{q.kind === 'sentence' ? 'Zin' : 'Beschrijving'}</p>
									<p class="font-heading text-lg font-semibold">{q.prompt}</p>
									{#if q.translation}<p class="text-text-muted">{q.translation}</p>{/if}
									{#if q.explanation}<p class="text-sm">Waarom: {q.explanation}</p>{/if}
									<p class={['rounded-tile px-3 py-1.5 text-sm font-semibold', q.checkOk === true ? 'bg-sage-soft' : q.checkOk === false ? 'bg-rose-soft' : 'bg-surface-2 text-text-muted']}>
										{q.checkOk === true ? '✓ Controle: ok' : q.checkOk === false ? `⚠ ${q.checkNote || 'Controle twijfelt'}` : q.checkNote || 'Niet gecontroleerd'}
									</p>
									<div class="flex flex-wrap gap-2">
										{#if q.status !== 'approved'}<Button size="sm" disabled={busy} onclick={() => setStatus([q.id], 'approved')}><Icon name="check" size={16} /> Goedkeuren</Button>{/if}
										{#if q.status !== 'rejected'}<Button size="sm" variant="secondary" disabled={busy} onclick={() => setStatus([q.id], 'rejected')}><Icon name="x" size={16} /> Afwijzen</Button>{/if}
										{#if q.status !== 'draft'}<Button size="sm" variant="ghost" disabled={busy} onclick={() => setStatus([q.id], 'draft')}>Terugzetten</Button>{/if}
										<Button size="sm" variant="ghost" disabled={busy} onclick={() => startEdit(q)}><Icon name="pencil" size={16} /> Bewerken</Button>
										<Button size="sm" variant="ghost" disabled={busy} aria-label="Vraag verwijderen" onclick={() => remove(q.id)}><Icon name="trash" size={16} /></Button>
									</div>
								{/if}
							</div>
						{:else}
							<p class="py-6 text-center text-text-muted">Geen vragen in deze lijst.</p>
						{/each}
					{/if}
				</Card>
			</div>
		{/if}
	{/if}
</div>
