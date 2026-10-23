<script lang="ts">
	import { onDestroy } from 'svelte';
	import { buildTipRequest, requestAiTips, resolveTips, type TipTarget } from '../../ai/tips';
	import type { StudySet, StudyList, StudyRow } from '../../schema/types';
	import { auth } from '../../state/auth.svelte';
	import { settings } from '../../state/settings.svelte';
	import { toasts } from '../../state/toast.svelte';
	import { getStorage } from '../../storage';
	import { StorageError } from '../../storage/adapter';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Icon from '../ui/Icon.svelte';
	import Skeleton from '../ui/Skeleton.svelte';

	// "Uitleg bij je fouten": the rows that went wrong with their saved tip, and a button that lets the AI write a short
	// explanation or mnemonic for the ones without. The AI's tips are proposals: nothing is stored until "Bewaar uitleg".
	type Props = {
		sets: StudySet[];
		/** rowKey (`setId/listId/rowId`) of every row that went wrong. */
		keys: string[];
		/** What the student typed, per rowKey (test mode only). */
		given?: Record<string, string>;
	};
	let { sets, keys, given = {} }: Props = $props();

	type Entry = { key: string; set: StudySet; list: StudyList; row: StudyRow };
	const storage = getStorage();

	const entries = $derived.by(() => {
		const out: Entry[] = [];
		const seen = new Set<string>();
		for (const key of keys) {
			if (seen.has(key)) continue;
			seen.add(key);
			const [setId, listId, rowId] = key.split('/');
			const set = sets.find((s) => s.id === setId);
			const list = set?.lists.find((l) => l.id === listId);
			const row = list?.rows.find((r) => r.id === rowId);
			if (set && list && row) out.push({ key, set, list, row });
		}
		return out;
	});

	let saved = $state<Record<string, string>>({});
	let proposals = $state<Record<string, string>>({});
	let generating = $state(false);
	let saving = $state(false);
	let problem = $state('');
	let abort: AbortController | null = null;
	onDestroy(() => abort?.abort());

	const tipOf = (e: Entry) => saved[e.key] ?? e.row.tip ?? '';
	const missing = $derived(entries.filter((e) => !tipOf(e) && !(e.key in proposals)));
	const proposalKeys = $derived(Object.keys(proposals));

	async function generate() {
		if (generating || missing.length === 0) return;
		problem = '';
		generating = true;
		const targets: TipTarget[] = missing.map((e) => ({ key: e.key, list: e.list.title, kind: e.list.kind, prompt: e.row.prompt, answers: e.row.answers, given: given[e.key] }));
		const subject = [...new Set(sets.map((s) => s.subject))].join(', ');
		const { request, refs } = buildTipRequest(targets, { subject, level: settings.value.level });
		abort = new AbortController();
		const outcome = await requestAiTips(request, abort.signal);
		abort = null;
		generating = false;
		if (!outcome.ok) {
			if (!outcome.aborted) problem = outcome.message;
			return;
		}
		const tips = resolveTips(outcome.output, refs);
		if (!tips || tips.size === 0) {
			problem = 'De AI kon hier geen goede uitleg bij maken. Probeer het later opnieuw.';
			return;
		}
		proposals = { ...proposals, ...Object.fromEntries(tips) };
	}

	function discard(key: string) {
		const { [key]: _removed, ...rest } = proposals;
		proposals = rest;
	}

	async function save() {
		if (saving || proposalKeys.length === 0) return;
		saving = true;
		const bySet = new Map<string, string[]>();
		for (const key of proposalKeys) {
			const setId = key.split('/')[0] ?? '';
			bySet.set(setId, [...(bySet.get(setId) ?? []), key]);
		}
		let done = 0;
		try {
			for (const [setId, setKeys] of bySet) {
				// Write into the freshest copy of the set, so edits made elsewhere are not lost.
				const fresh = await storage.getSet(setId);
				if (!fresh) continue;
				for (const key of setKeys) {
					const [, listId, rowId] = key.split('/');
					const row = fresh.lists.find((l) => l.id === listId)?.rows.find((r) => r.id === rowId);
					if (!row) continue;
					row.tip = proposals[key];
					done++;
				}
				await storage.saveSet(fresh);
			}
			saved = { ...saved, ...proposals };
			proposals = {};
			toasts.show(`Uitleg bewaard (${done})`);
		} catch (error) {
			toasts.show(error instanceof StorageError ? error.message : 'Bewaren is mislukt');
		} finally {
			saving = false;
		}
	}
</script>

{#if entries.length > 0}
	<Card class="w-full text-left">
		<div class="flex flex-wrap items-center gap-3">
			<h2 class="min-w-0 flex-1 font-heading text-lg font-semibold">Uitleg bij je fouten</h2>
			{#if auth.user && proposalKeys.length === 0 && missing.length > 0}
				<Button variant="secondary" size="sm" onclick={generate} disabled={generating} class="min-w-44">
					<Icon name="sparkles" size={16} /> {generating ? 'Uiltje schrijft…' : `Maak uitleg met AI (${Math.min(missing.length, 30)})`}
				</Button>
			{/if}
			{#if proposalKeys.length > 0}
				<Button size="sm" onclick={save} disabled={saving} class="min-w-44"><Icon name="check" size={16} /> {saving ? 'Bewaren…' : `Bewaar uitleg (${proposalKeys.length})`}</Button>
			{/if}
		</div>
		<p class="min-h-6 text-sm font-semibold text-rose-edge" role="alert">{problem}</p>
		<ul class="mt-1 flex flex-col gap-3">
			{#each entries as entry (entry.key)}
				{@const tip = proposals[entry.key] ?? tipOf(entry)}
				<li class="rounded-tile bg-surface-2 p-3">
					<p class="text-sm text-text-muted">{entry.list.title}</p>
					<p class="font-heading font-semibold">{entry.row.prompt} <span aria-hidden="true">→</span> <span class="text-sage-edge">{entry.row.answers.join(' / ')}</span></p>
					{#if generating && !tip && missing.some((m) => m.key === entry.key)}
						<Skeleton class="mt-2 h-4 w-3/4" />
					{:else if tip}
						<div class="mt-1 flex items-start gap-2 text-sm">
							<Icon name="bulb" size={16} class="mt-0.5 shrink-0" />
							<p class="min-w-0 flex-1">{tip}</p>
							{#if entry.key in proposals}
								<Button variant="ghost" size="sm" iconOnly aria-label="Deze uitleg weggooien" onclick={() => discard(entry.key)}><Icon name="x" size={16} /></Button>
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
		{#if proposalKeys.length > 0}
			<p class="mt-3 text-sm text-text-muted">De AI maakt weleens fouten. Gooi uitleg weg die niet klopt voordat je bewaart; bewaarde uitleg zie je daarna ook op de setpagina en in de editor.</p>
		{/if}
	</Card>
{/if}
