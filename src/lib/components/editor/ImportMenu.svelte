<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import CardImportModal from './CardImportModal.svelte';
	import SetJsonImportModal from './SetJsonImportModal.svelte';
	import Dropdown from '../ui/Dropdown.svelte';
	import Icon from '../ui/Icon.svelte';
	import MenuItem from '../ui/MenuItem.svelte';

	// One "Importeren" button for everything that brings a set in from elsewhere. The two text imports open a dialog
	// right here (no page change), the photo/document import is the AI page.
	type Props = { size?: 'sm' | 'md' | 'lg'; variant?: 'primary' | 'secondary' | 'ghost' };
	let { size = 'md', variant = 'secondary' }: Props = $props();

	let cardsOpen = $state(false);
	let jsonOpen = $state(false);

	// Links from the dashboard and the search palette open a dialog directly: /sets?import=cards or /sets?import=json.
	onMount(() => {
		const wanted = page.url.searchParams.get('import');
		if (wanted === 'cards') cardsOpen = true;
		else if (wanted === 'json') jsonOpen = true;
		else return;
		try {
			replaceState('/sets', {}); // so a refresh does not open the dialog again
		} catch {
			/* router not ready yet: the parameter simply stays */
		}
	});
</script>

<Dropdown label="Importeren" {variant} {size}>
	{#snippet trigger()}<Icon name="import" size={18} /> Importeren{/snippet}
	<MenuItem icon="paste" onclick={() => (cardsOpen = true)}>Quizlet of StudyGo</MenuItem>
	<MenuItem icon="sparkles" href="/sets/ai?source=photos">Foto of document (met AI)</MenuItem>
	<MenuItem icon="code" onclick={() => (jsonOpen = true)}>JSON</MenuItem>
</Dropdown>

<CardImportModal bind:open={cardsOpen} />
<SetJsonImportModal bind:open={jsonOpen} />
