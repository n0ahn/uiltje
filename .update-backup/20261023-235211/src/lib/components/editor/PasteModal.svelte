<script lang="ts">
	import { parsePaste } from '../../editor/paste';
	import Button from '../ui/Button.svelte';
	import Modal from '../ui/Modal.svelte';

	type Props = { open: boolean; onadd: (rows: { prompt: string; answers: string[] }[]) => void };
	let { open = $bindable(false), onadd }: Props = $props();

	let text = $state('');
	const result = $derived(parsePaste(text));

	function add() {
		onadd(result.rows);
		text = '';
		open = false;
	}
</script>

<Modal bind:open title="Plak uit tekst">
	<p class="mb-3 text-text-muted">
		Eén rij per regel: vraag en antwoord gescheiden door een tab, <kbd>;</kbd> of <kbd>=</kbd>. Meerdere goede antwoorden scheid je met <kbd>/</kbd>.
	</p>
	<textarea class="input min-h-40 font-mono text-sm" bind:value={text} placeholder={'ev nom ; mensa\nev gen ; mensae\nev dat ; mensae'} aria-label="Tekst met rijen"></textarea>
	<p class="mt-2 text-sm font-semibold text-text-muted" aria-live="polite">
		{result.rows.length} {result.rows.length === 1 ? 'rij' : 'rijen'} herkend{result.skipped > 0 ? `, ${result.skipped} ${result.skipped === 1 ? 'regel' : 'regels'} overgeslagen (geen scheidingsteken of antwoord)` : ''}
	</p>
	{#snippet actions()}
		<Button variant="ghost" onclick={() => (open = false)}>Annuleren</Button>
		<Button disabled={result.rows.length === 0} onclick={add}>Toevoegen</Button>
	{/snippet}
</Modal>