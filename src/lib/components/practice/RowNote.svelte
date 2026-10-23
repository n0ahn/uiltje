<script lang="ts">
	import { resolveItem } from '../../grammar/catalogues';
	import { describe } from '../../grammar/rows';
	import type { StudySet } from '../../schema/types';
	import Icon from '../ui/Icon.svelte';

	// Shown under a wrong answer: the row's own explanation (`tip`: written by you, by the AI after a test, or by the owner
	// for an approved question) and, for rows from the syllabus, the official explanation of the term.
	type Props = { sets: readonly StudySet[]; rowKey: string };
	let { sets, rowKey }: Props = $props();

	const notes = $derived.by(() => {
		const [setId, listId, rowId] = rowKey.split('/');
		const row = sets.find((s) => s.id === setId)?.lists.find((l) => l.id === listId)?.rows.find((r) => r.id === rowId);
		if (!row) return [];
		const out: { label: string; text: string }[] = [];
		const tip = row.tip?.trim();
		if (tip) out.push({ label: 'Uitleg', text: tip });
		const found = row.ref ? resolveItem(row.ref) : undefined;
		if (found) out.push({ label: found.item.term, text: describe(found.item) });
		return out;
	});
</script>

{#if notes.length > 0}
	<div class="flex flex-col gap-2 rounded-tile bg-surface-2 p-3 text-sm" aria-label="Uitleg bij dit antwoord">
		{#each notes as note (note.label + note.text)}
			<p class="flex items-start gap-2"><Icon name="bulb" size={16} class="mt-0.5 shrink-0" /> <span><span class="font-semibold">{note.label}:</span> {note.text}</span></p>
		{/each}
	</div>
{/if}
