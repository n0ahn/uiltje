<script lang="ts">
	import { page } from '$app/state';
	import { guestImport } from '../../state/guest-import.svelte';
	import Button from '../ui/Button.svelte';
	import Modal from '../ui/Modal.svelte';

	const sets = $derived(guestImport.found?.sets ?? 0);
	const results = $derived(guestImport.found?.results ?? 0);
</script>

<Modal bind:open={guestImport.open} title="Je gastgegevens overzetten?" onclose={() => guestImport.dismiss(page.data.user?.id ?? null)}>
	<p>
		Op dit apparaat staan {sets === 1 ? '1 set' : `${sets} sets`}{results > 0
			? ` en ${results === 1 ? '1 toetsresultaat' : `${results} toetsresultaten`}`
			: ''} die je als gast hebt gemaakt. Wil je ze in je account zetten, zodat je ze overal kunt gebruiken?
	</p>
	<p class="mt-2 text-sm text-text-muted">Je kunt dit later ook doen via Instellingen.</p>
	{#snippet actions()}
		<Button variant="ghost" disabled={guestImport.busy} onclick={() => guestImport.dismiss(page.data.user?.id ?? null)}>Niet nu</Button>
		<Button class="min-w-36" disabled={guestImport.busy} onclick={() => guestImport.run()}>
			{guestImport.busy ? 'Bezig…' : 'Overzetten'}
		</Button>
	{/snippet}
</Modal>
