<script lang="ts">
	import { onDestroy } from 'svelte';
	import { buildEditRequest, resolveEditPlan, type EditChange, type EditPlan, type RefMap } from '../../ai/edit';
	import { requestAiEdit } from '../../ai/edit-client';
	import type { EditorState } from '../../editor/state.svelte';
	import type { DraftList, DraftSet } from '../../editor/types';
	import { toasts } from '../../state/toast.svelte';
	import AiEditSkeleton from '../skeleton/AiEditSkeleton.svelte';
	import Button from '../ui/Button.svelte';
	import Icon from '../ui/Icon.svelte';
	import Modal from '../ui/Modal.svelte';
	import Owl from '../ui/Owl.svelte';
	import Segmented from '../ui/Segmented.svelte';

	// "Aanpassen met AI": the student types what should change, the AI proposes edits, additions and deletions,
	// and only the ticked ones are applied to the editor (the normal autosave and "Opslaan" take it from there).
	type Props = {
		open: boolean;
		editor: EditorState;
		/** The list that is open in the editor. */
		activeListId: string | null;
		/** Called after applying, with the set as it was before (for "Ongedaan maken"). */
		onapplied: (before: DraftSet, count: number) => void;
	};
	let { open = $bindable(false), editor, activeListId, onapplied }: Props = $props();

	const EXAMPLES = ['Controleer accenten en spelfouten', 'Voeg de ontbrekende vormen toe', 'Schrijf alle antwoorden op dezelfde manier', 'Haal dubbele rijen weg'];

	type Step = 'input' | 'working' | 'review';
	let step = $state<Step>('input');
	let instruction = $state('');
	let scope = $state<'list' | 'set'>('list');
	let problem = $state('');
	let plan = $state<EditPlan | null>(null);
	let picked = $state<string[]>([]);
	let abort: AbortController | null = null;
	// What was sent, so the answer can be mapped back (the user may keep editing while the AI works).
	let sentLists: DraftList[] = [];
	let sentRefs: RefMap | null = null;

	const activeList = $derived(editor.set.lists.find((l) => l.id === activeListId) ?? editor.set.lists[0] ?? null);
	const scopes = $derived([
		{ id: 'list', name: 'Deze lijst', text: activeList ? `Alleen "${activeList.title.trim() || 'Naamloze lijst'}" (${activeList.rows.length} rijen).` : 'Alleen de lijst die open staat.' },
		{ id: 'set', name: 'Hele set', text: `Alle ${editor.set.lists.length} lijsten. Duurt langer en kost meer van de gratis limiet.` }
	] as const);

	onDestroy(() => abort?.abort());

	async function start() {
		problem = '';
		if (instruction.trim() === '') {
			problem = 'Schrijf kort op wat de AI moet aanpassen.';
			return;
		}
		const lists = scope === 'set' ? editor.set.lists : activeList ? [activeList] : [];
		const built = buildEditRequest($state.snapshot(lists) as DraftList[], instruction);
		if (!built.ok) {
			problem = built.message;
			return;
		}
		sentLists = $state.snapshot(lists) as DraftList[];
		sentRefs = built.refs;
		step = 'working';
		abort = new AbortController();
		const outcome = await requestAiEdit(built.request, abort.signal);
		abort = null;
		if (!outcome.ok) {
			step = 'input';
			if (!outcome.aborted) problem = outcome.message;
			return;
		}
		const resolved = sentRefs ? resolveEditPlan(outcome.output, sentLists, sentRefs) : null;
		if (!resolved) {
			step = 'input';
			problem = 'De AI gaf een antwoord dat niet klopt. Probeer het opnieuw.';
			return;
		}
		plan = resolved;
		picked = resolved.changes.map((c) => c.id);
		step = 'review';
	}

	function toggle(id: string) {
		picked = picked.includes(id) ? picked.filter((p) => p !== id) : [...picked, id];
	}

	function apply() {
		if (!plan) return;
		const chosen = plan.changes.filter((c) => picked.includes(c.id));
		const before = JSON.parse(JSON.stringify($state.snapshot(editor.set))) as DraftSet;
		const applied = editor.applyEdit(chosen);
		if (applied === 0) {
			toasts.show('Er kon niets worden toegepast; de rijen zijn intussen veranderd.');
			return;
		}
		onapplied(before, applied);
		close();
	}

	function close() {
		abort?.abort();
		open = false;
	}

	function reset() {
		step = 'input';
		plan = null;
		picked = [];
		problem = '';
	}

	$effect(() => {
		if (!open) {
			abort?.abort();
			reset();
		}
	});

	const KIND_NAME = { edit: 'Aangepast', add: 'Nieuw', delete: 'Verwijderd' } as const;
	const answers = (a: string[]) => a.join(' / ');
	const label = (c: EditChange) => c.listTitle.trim() || 'Naamloze lijst';
</script>

<Modal bind:open title="Aanpassen met AI">
	{#if step === 'input'}
		<div class="flex flex-col gap-4">
			<p class="text-text-muted">Schrijf wat er in deze set moet veranderen. Je ziet eerst alle voorstellen en kiest zelf welke je overneemt; er wordt niets veranderd zonder jouw akkoord.</p>
			<label>
				<span class="mb-1.5 block text-sm font-semibold text-text-muted">Wat moet de AI doen?</span>
				<textarea class="input min-h-24" bind:value={instruction} maxlength="500" placeholder="bijv. Voeg de ontbrekende vormen van de ablatief toe"></textarea>
			</label>
			<div class="flex flex-wrap gap-2" aria-label="Voorbeelden">
				{#each EXAMPLES as example (example)}
					<Button variant="secondary" size="sm" onclick={() => (instruction = example)}>{example}</Button>
				{/each}
			</div>
			<Segmented legend="Waarop?" options={scopes} bind:value={scope} />
			<p class="min-h-6 text-sm font-semibold text-rose-edge" role="alert">{problem}</p>
			<p class="text-sm text-text-muted">De rijen worden naar Google Gemini gestuurd om te lezen en niet door Uiltje bewaard.</p>
		</div>
	{:else if step === 'working'}
		<div class="flex flex-col gap-4">
			<div class="flex items-center gap-4">
				<Owl pose="thinking" size={56} />
				<div class="min-w-0 flex-1" role="status" aria-live="polite">
					<p class="font-heading text-lg font-semibold">Uiltje denkt na…</p>
					<p class="text-sm text-text-muted">Dit duurt meestal 10 tot 30 seconden.</p>
				</div>
			</div>
			<AiEditSkeleton />
		</div>
	{:else if plan}
		<div class="flex flex-col gap-3">
			{#if plan.summary}<p class="font-semibold">{plan.summary}</p>{/if}
			{#if plan.changes.length === 0}
				<p class="text-text-muted">De AI heeft niets gevonden om aan te passen. Probeer een duidelijkere opdracht.</p>
			{:else}
				<div class="flex items-center justify-between gap-3">
					<p class="text-sm font-semibold text-text-muted" aria-live="polite">{picked.length} van {plan.changes.length} gekozen</p>
					<Button variant="ghost" size="sm" onclick={() => (picked = picked.length === plan!.changes.length ? [] : plan!.changes.map((c) => c.id))}>{picked.length === plan.changes.length ? 'Niets kiezen' : 'Alles kiezen'}</Button>
				</div>
				<ul class="flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-1">
					{#each plan.changes as change (change.id)}
						<li>
							<label class={['flex cursor-pointer items-start gap-3 rounded-tile border-2 p-3', picked.includes(change.id) ? 'border-primary bg-primary-soft' : 'border-border bg-surface']}>
								<input type="checkbox" class="mt-1 size-5 shrink-0 accent-primary" checked={picked.includes(change.id)} onchange={() => toggle(change.id)} />
								<span class="min-w-0 flex-1 text-sm">
									<span class="flex flex-wrap items-center gap-2">
										<span class={['rounded-full px-2 py-0.5 text-xs font-bold', change.kind === 'delete' ? 'bg-surface-2 text-rose-edge' : change.kind === 'add' ? 'bg-surface-2 text-sage-edge' : 'bg-surface-2']}>{KIND_NAME[change.kind]}</span>
										<span class="truncate text-text-muted">{label(change)}</span>
									</span>
									{#if change.kind === 'edit'}
										<span class="mt-1 block"><span class="text-text-muted line-through">{change.before.prompt}: {answers(change.before.answers)}</span></span>
										<span class="block font-semibold">{change.after.prompt}: {answers(change.after.answers)}</span>
									{:else if change.kind === 'add'}
										<span class="mt-1 block font-semibold">{change.after.prompt}: {answers(change.after.answers)}</span>
									{:else}
										<span class="mt-1 block text-text-muted line-through">{change.before.prompt}: {answers(change.before.answers)}</span>
									{/if}
									{#if change.reason}<span class="block text-text-muted">{change.reason}</span>{/if}
								</span>
							</label>
						</li>
					{/each}
				</ul>
				{#if plan.dropped > 0}
					<p class="text-sm text-text-muted">{plan.dropped} {plan.dropped === 1 ? 'voorstel' : 'voorstellen'} van de AI zijn weggelaten omdat ze niet klopten met je set.</p>
				{/if}
			{/if}
		</div>
	{/if}
	{#snippet actions()}
		{#if step === 'input'}
			<Button variant="ghost" onclick={close}>Annuleren</Button>
			<Button onclick={start} disabled={instruction.trim() === ''} class="min-w-40"><Icon name="sparkles" size={18} /> Voorstellen maken</Button>
		{:else if step === 'working'}
			<Button variant="ghost" onclick={() => abort?.abort()}>Annuleren</Button>
		{:else}
			<Button variant="ghost" onclick={reset}>Terug</Button>
			<Button onclick={apply} disabled={picked.length === 0} class="min-w-40"><Icon name="check" size={18} /> Toepassen ({picked.length})</Button>
		{/if}
	{/snippet}
</Modal>
