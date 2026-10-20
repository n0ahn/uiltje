<script lang="ts">
	import { exportSetJson, importSetJson, downloadSetJson } from '../../editor/json';
	import type { StudySet } from '../../schema/types';
	import { toasts } from '../../state/toast.svelte';
	import Button from '../ui/Button.svelte';
	import Modal from '../ui/Modal.svelte';

	type Props = {
		open: boolean;
		/** Current set as StudySet, or null while it is still incomplete. */
		current: StudySet | null;
		onimport: (set: StudySet) => void;
		/** Tab to show when opening. */
		startTab?: 'import' | 'export';
	};
	let { open = $bindable(false), current, onimport, startTab = 'export' }: Props = $props();

	let tab = $state<'import' | 'export'>('export');
	let text = $state('');
	let issues = $state<string[]>([]);

	$effect(() => {
		if (open) {
			tab = startTab;
			issues = [];
		}
	});

	const exported = $derived(current ? exportSetJson(current) : '');

	function runImport() {
		const result = importSetJson(text);
		if (!result.ok) {
			issues = result.issues;
			return;
		}
		issues = [];
		text = '';
		onimport(result.set);
		open = false;
	}

	async function copy() {
		try {
			await navigator.clipboard.writeText(exported);
			toasts.show('JSON gekopieerd');
		} catch {
			toasts.show('Kopiëren lukt niet, selecteer de tekst zelf');
		}
	}
</script>

<Modal bind:open title="JSON">
	<div class="mb-4 flex gap-2" role="tablist" aria-label="JSON">
		{#each [['export', 'Exporteren'], ['import', 'Importeren']] as const as [id, label] (id)}
			<button type="button" role="tab" aria-selected={tab === id} class={['rounded-full px-4 py-1.5 font-semibold', tab === id ? 'bg-primary-soft text-primary-text' : 'text-text-muted']} onclick={() => (tab = id)}>
				{label}
			</button>
		{/each}
	</div>

	{#if tab === 'export'}
		{#if current}
			<textarea class="input min-h-56 font-mono text-sm" readonly value={exported} aria-label="JSON van deze set"></textarea>
			<div class="mt-3 flex flex-wrap gap-2">
				<Button variant="secondary" onclick={copy}>Kopiëren</Button>
				<Button variant="secondary" onclick={() => downloadSetJson(current)}>Downloaden</Button>
			</div>
		{:else}
			<p class="text-text-muted">Vul eerst alle verplichte velden in, dan kun je de set exporteren.</p>
		{/if}
	{:else}
		<p class="mb-3 text-text-muted">Plak JSON van een set. De huidige inhoud van de editor wordt vervangen.</p>
		<textarea class="input min-h-56 font-mono text-sm" bind:value={text} aria-label="JSON om te importeren" placeholder={'{ "title": "…", "subject": "…", "lists": [ … ] }'}></textarea>
		{#if issues.length > 0}
			<div class="mt-3 rounded-tile bg-surface-2 p-3" role="alert">
				<p class="mb-1 font-semibold text-rose-edge">Dit kan nog niet geïmporteerd worden:</p>
				<ul class="list-disc pl-5 text-sm">
					{#each issues.slice(0, 8) as issue (issue)}<li>{issue}</li>{/each}
				</ul>
				{#if issues.length > 8}<p class="mt-1 text-sm text-text-muted">…en nog {issues.length - 8} andere problemen.</p>{/if}
			</div>
		{/if}
		<div class="mt-3"><Button disabled={text.trim() === ''} onclick={runImport}>Importeren</Button></div>
	{/if}
</Modal>