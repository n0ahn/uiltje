<script lang="ts">
	import { goto } from '$app/navigation';
	import { importSetJson } from '../../editor/json';
	import { copyOfSet } from '../../social/copy';
	import { toasts } from '../../state/toast.svelte';
	import { getStorage } from '../../storage';
	import { StorageError } from '../../storage/adapter';
	import { newId } from '../../utils/id';
	import Button from '../ui/Button.svelte';
	import Icon from '../ui/Icon.svelte';
	import Modal from '../ui/Modal.svelte';

	// Import a set from JSON (pasted or from a .json file) straight from the overview: it becomes a new set.
	type Props = { open: boolean };
	let { open = $bindable(false) }: Props = $props();

	const storage = getStorage();
	let text = $state('');
	let issues = $state<string[]>([]);
	let saving = $state(false);

	$effect(() => {
		if (open) issues = [];
	});

	async function pickFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		if (file.size > 2_000_000) {
			issues = ['Dit bestand is te groot (maximaal 2 MB).'];
			return;
		}
		issues = [];
		text = await file.text();
	}

	async function create() {
		if (saving) return;
		const result = importSetJson(text);
		if (!result.ok) {
			issues = result.issues;
			return;
		}
		saving = true;
		try {
			// Fresh ids, so importing the same file twice (or a set you already have) never overwrites anything.
			const set = copyOfSet(result.set, newId);
			await storage.saveSet(set);
			text = '';
			open = false;
			await goto(`/sets/${set.id}`);
		} catch (error) {
			toasts.show(error instanceof StorageError ? error.message : 'Opslaan is mislukt');
		} finally {
			saving = false;
		}
	}
</script>

<Modal bind:open title="Importeren uit JSON">
	<div class="flex flex-col gap-4">
		<p class="text-text-muted">Plak de JSON van een set, of kies een .json-bestand. Je krijgt een nieuwe set; bestaande sets blijven ongemoeid.</p>
		<textarea class="input min-h-48 font-mono text-sm" bind:value={text} aria-label="JSON om te importeren" placeholder={'{ "title": "…", "subject": "…", "lists": [ … ] }'}></textarea>
		<label class="inline-flex w-fit cursor-pointer items-center gap-2 text-sm font-semibold text-primary">
			<Icon name="import" size={16} /> Of kies een bestand (.json)
			<input type="file" accept=".json,application/json" class="sr-only" onchange={pickFile} aria-label="JSON-bestand kiezen" />
		</label>
		<div class="min-h-16" role="alert">
			{#if issues.length > 0}
				<div class="rounded-tile bg-surface-2 p-3">
					<p class="mb-1 font-semibold text-rose-edge">Dit kan nog niet geïmporteerd worden:</p>
					<ul class="list-disc pl-5 text-sm">{#each issues.slice(0, 6) as issue (issue)}<li>{issue}</li>{/each}</ul>
					{#if issues.length > 6}<p class="mt-1 text-sm text-text-muted">…en nog {issues.length - 6} andere problemen.</p>{/if}
				</div>
			{/if}
		</div>
	</div>
	{#snippet actions()}
		<Button variant="ghost" onclick={() => (open = false)}>Annuleren</Button>
		<Button disabled={text.trim() === '' || saving} onclick={create} class="min-w-36">{saving ? 'Bezig…' : 'Set maken'}</Button>
	{/snippet}
</Modal>
