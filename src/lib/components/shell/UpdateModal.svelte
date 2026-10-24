<script lang="ts">
	import { page } from '$app/state';
	import { updates } from '../../state/updates.svelte';
	import type { ChangeKind } from '../../changelog';
	import Button from '../ui/Button.svelte';
	import Chip from '../ui/Chip.svelte';
	import Modal from '../ui/Modal.svelte';
	import Owl from '../ui/Owl.svelte';

	const LABEL: Record<ChangeKind, string> = { new: 'Nieuw', changed: 'Aangepast', fixed: 'Opgelost' };
	const dateFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });

	// Never interrupt a practice run or a game: wait until the learner is on another page.
	const busy = $derived(/\/(practice|minigames)(\/|$)/.test(page.url.pathname));
	$effect(() => {
		if (!busy) updates.check();
	});
</script>

<Modal bind:open={updates.open} title="Wat is er nieuw?" onclose={() => updates.dismiss()}>
	<div class="flex flex-col gap-5">
		{#each updates.entries as entry, i (entry.id)}
			<section class="flex flex-col gap-2">
				{#if i === 0}<Owl pose="happy" size={64} />{/if}
				<h3 class="font-heading text-lg font-semibold">{entry.title} <span class="text-sm font-normal text-text-muted">· {entry.size === 'big' ? 'Grote update' : 'Kleine update'} · {dateFormat.format(new Date(entry.date))}</span></h3>
				<ul class="flex flex-col gap-2">
					{#each entry.changes as change (change.text)}
						<li class="flex items-start gap-2"><Chip class="mt-0.5 min-w-24 shrink-0 justify-center">{LABEL[change.kind]}</Chip><span>{change.text}</span></li>
					{/each}
				</ul>
			</section>
		{/each}
	</div>
	{#snippet actions()}
		<Button class="min-w-36" onclick={() => updates.dismiss()}>Top, bedankt!</Button>
	{/snippet}
</Modal>
