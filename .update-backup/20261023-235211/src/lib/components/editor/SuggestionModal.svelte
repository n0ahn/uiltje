<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { createSuggestionsApi } from '../../grammar/suggestions';
	import { catalogueForSubject } from '../../grammar/picker';
	import { emptySuggestion, LIMITS, SUGGESTION_SUBJECTS, validateSuggestion, type SuggestionInput, type SuggestionSubject } from '../../grammar/suggestions-core';
	import { auth } from '../../state/auth.svelte';
	import { toasts } from '../../state/toast.svelte';
	import { StorageError } from '../../storage/adapter';
	import Button from '../ui/Button.svelte';
	import Icon from '../ui/Icon.svelte';
	import Modal from '../ui/Modal.svelte';
	import Segmented from '../ui/Segmented.svelte';

	// "Stel een regel voor": a grammar rule or term that should become standard in the app. The owner reads it and accepts
	// or rejects it; accepted rules appear for everyone in the "kies onderdelen" screen.
	type Props = { open?: boolean; /** Subject of the set you are editing, used as the starting choice. */ subject?: string; onsent?: () => void };
	let { open = $bindable(false), subject = '', onsent }: Props = $props();

	const SUBJECT_CHOICES = SUGGESTION_SUBJECTS.map((id) => ({ id, name: id }));

	let form = $state<SuggestionInput>(emptySuggestion());
	let error = $state('');
	let sending = $state(false);

	// Every time the dialog opens it starts empty, with the subject of the set you are working on.
	$effect(() => {
		if (!open) return;
		untrack(() => {
			const known = catalogueForSubject(subject)?.subject;
			form = emptySuggestion((known as SuggestionSubject | undefined) ?? 'Latijn');
			error = '';
		});
	});

	async function send() {
		if (sending || !auth.client || !auth.user) return;
		const problem = validateSuggestion(form);
		if (problem) {
			error = problem;
			return;
		}
		sending = true;
		error = '';
		try {
			await createSuggestionsApi(auth.client).submit(auth.user.id, form);
			toasts.show('Bedankt! Je voorstel is verstuurd.');
			open = false;
			onsent?.();
		} catch (e) {
			error = e instanceof StorageError ? e.message : 'Het voorstel kon niet verstuurd worden.';
		} finally {
			sending = false;
		}
	}
</script>

{#snippet actions()}
	<Button variant="ghost" onclick={() => (open = false)}>Annuleren</Button>
	{#if auth.user}<Button onclick={send} disabled={sending} class="min-w-36"><Icon name="check" size={18} /> {sending ? 'Versturen…' : 'Versturen'}</Button>{/if}
{/snippet}

<Modal bind:open title="Stel een regel voor" {actions}>
	{#if !auth.user}
		<div class="flex flex-col items-start gap-3">
			<p class="text-text-muted">Log in om een regel of begrip voor te stellen. Dan kan de beheerder het goedkeuren en komt het voor iedereen in de lijst.</p>
			<Button href="/login?next={encodeURIComponent(page.url.pathname)}"><Icon name="log-in" size={18} /> Inloggen</Button>
		</div>
	{:else}
		<form class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); void send(); }}>
			<p class="text-sm text-text-muted">Mis je een stijlfiguur of grammaticale regel die standaard in de app zou moeten staan? Vul het hieronder in. De beheerder kijkt ernaar; als het wordt goedgekeurd, kan iedereen het kiezen.</p>
			<Segmented legend="Voor welk vak?" options={SUBJECT_CHOICES} bind:value={form.subject} />
			<label>
				<span class="mb-1.5 block text-sm font-semibold text-text-muted">Naam van de regel of het begrip</span>
				<input class="input" bind:value={form.term} maxlength={LIMITS.term} placeholder="bijv. ablativus absolutus" autocapitalize="none" />
			</label>
			<label>
				<span class="mb-1.5 block text-sm font-semibold text-text-muted">Uitleg (zonder de naam zelf te noemen)</span>
				<textarea class="input min-h-24" bind:value={form.definition} maxlength={LIMITS.definition} placeholder="bijv. Een losse bepaling met een participium en een zelfstandig naamwoord, beide in de ablativus."></textarea>
			</label>
			<div class="grid gap-3 sm:grid-cols-2">
				<label>
					<span class="mb-1.5 block text-sm font-semibold text-text-muted">Voorbeeld (optioneel)</span>
					<input class="input" bind:value={form.example} maxlength={LIMITS.example} autocapitalize="none" spellcheck="false" />
				</label>
				<label>
					<span class="mb-1.5 block text-sm font-semibold text-text-muted">Vertaling van het voorbeeld</span>
					<input class="input" bind:value={form.exampleTranslation} maxlength={LIMITS.exampleTranslation} />
				</label>
			</div>
			<label>
				<span class="mb-1.5 block text-sm font-semibold text-text-muted">Bron (optioneel)</span>
				<input class="input" bind:value={form.source} maxlength={LIMITS.source} placeholder="bijv. syllabus, je grammatica of boek met bladzijde" />
			</label>
			<p class="min-h-6 text-sm font-semibold text-rose-edge" role="alert">{error}</p>
		</form>
	{/if}
</Modal>
