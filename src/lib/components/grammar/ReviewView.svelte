<script lang="ts">
	import { page } from '$app/state';
	import { admin } from '../../state/admin.svelte';
	import { auth } from '../../state/auth.svelte';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Icon from '../ui/Icon.svelte';
	import Owl from '../ui/Owl.svelte';
	import Segmented from '../ui/Segmented.svelte';
	import DisputesReview from './DisputesReview.svelte';
	import QuestionBankView from './QuestionBankView.svelte';
	import SuggestionsReview from './SuggestionsReview.svelte';

	// Everything the owner has to look at in one place: AI questions (the old question bank), suggestions from users
	// and objections against the AI's verdict in "Uitleggen". Tab from ?tab=vragen|voorstellen|bezwaren.
	$effect(() => {
		void auth.user;
		void admin.refresh();
	});

	type Tab = 'vragen' | 'voorstellen' | 'bezwaren';
	const fromUrl = page.url.searchParams.get('tab');
	let tab = $state<Tab>(fromUrl === 'voorstellen' || fromUrl === 'bezwaren' ? fromUrl : 'vragen');
	let suggestionCount = $state<number | null>(null);
	let disputeCount = $state<number | null>(null);

	const options = $derived([
		{ id: 'vragen' as const, name: 'Vragenbank' },
		{ id: 'voorstellen' as const, name: `Voorstellen${suggestionCount === null ? '' : ` (${suggestionCount})`}` },
		{ id: 'bezwaren' as const, name: `Bezwaren${disputeCount === null ? '' : ` (${disputeCount})`}` }
	]);
</script>

<svelte:head><title>Review · Uiltje</title></svelte:head>

<div class="mx-auto flex max-w-6xl flex-col gap-5">
	<div class="flex flex-wrap items-center gap-4">
		<Owl pose="thinking" size={64} />
		<div class="min-w-0 flex-1">
			<h1 class="font-heading text-3xl font-semibold">Review</h1>
			<p class="text-text-muted">Vragen van de AI, voorstellen van gebruikers en bezwaren tegen het nakijken.</p>
		</div>
	</div>

	{#if !auth.user}
		<Card class="flex flex-col items-start gap-3">
			<p class="text-text-muted">Log in als beheerder om te reviewen.</p>
			<Button href="/login?next=/review"><Icon name="log-in" size={18} /> Inloggen</Button>
		</Card>
	{:else if !admin.isAdmin}
		<Card class="text-text-muted">Alleen de beheerder kan reviewen. Ben jij dat? Controleer of je in <code>app_admins</code> staat (zie SQL 004).</Card>
	{:else}
		<Segmented legend="Wat wil je reviewen?" options={options} bind:value={tab} />
		<!-- All three stay mounted so the counts load once and a tab keeps its state. -->
		<div class={tab === 'vragen' ? '' : 'hidden'}><QuestionBankView embedded /></div>
		<div class={tab === 'voorstellen' ? '' : 'hidden'}><SuggestionsReview oncount={(n) => (suggestionCount = n)} /></div>
		<div class={tab === 'bezwaren' ? '' : 'hidden'}><DisputesReview oncount={(n) => (disputeCount = n)} /></div>
	{/if}
</div>
