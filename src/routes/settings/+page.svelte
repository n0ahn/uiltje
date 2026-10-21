<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import type { PageProps } from './$types';
	import { DIRECTION_OPTIONS, STEP_BACK_OPTIONS, STRICTNESS_OPTIONS } from '#lib/components/practice/config.js';
	import AccountSettings from '#lib/components/settings/AccountSettings.svelte';
	import ProfileSettings from '#lib/components/settings/ProfileSettings.svelte';
	import ThemePicker from '#lib/components/settings/ThemePicker.svelte';
	import Segmented from '#lib/components/ui/Segmented.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import SettingsSkeleton from '#lib/components/skeleton/SettingsSkeleton.svelte';
	import OptionGroup from '#lib/components/ui/OptionGroup.svelte';
	import Toggle from '#lib/components/ui/Toggle.svelte';
	import { playSfx } from '#lib/audio/sfx.js';
	import { LEVELS } from '#lib/schema/types.js';
	import type { Level } from '#lib/schema/types.js';
	import { LEVEL_LABELS } from '#lib/settings/settings.js';
	import { guestImport } from '#lib/state/guest-import.svelte.js';
	import { settings } from '#lib/state/settings.svelte.js';
	
	onMount(() => void settings.load());

	let { data }: PageProps = $props();
	const user = $derived(data.user);

	type Tab = 'profiel' | 'voorkeuren' | 'account';
	const TABS = $derived(
		(user
			? [
					{ id: 'profiel', name: 'Profiel' },
					{ id: 'voorkeuren', name: 'Voorkeuren' },
					{ id: 'account', name: 'Account' }
				]
			: [
					{ id: 'voorkeuren', name: 'Voorkeuren' },
					{ id: 'account', name: 'Account' }
				]) as { id: Tab; name: string }[]
	);
	const requested = page.url.searchParams.get('tab');
	let tab = $state<Tab>(requested === 'profiel' || requested === 'account' ? requested : 'voorkeuren');
	// A guest has no profile tab.
	const shown = $derived<Tab>(!user && tab === 'profiel' ? 'voorkeuren' : tab);
	function chooseTab(t: Tab) {
		const url = new URL(page.url.href);
		url.searchParams.set('tab', t);
		replaceState(url, page.state);
	}
	// Look at this device once the page is there, so the import card knows whether it has anything to offer.
	$effect(() => {
		if (user) guestImport.check(user.id, false);
	});

	const levelOptions = LEVELS.map((id) => ({ id, name: LEVEL_LABELS[id] }));
	// The option groups edit local copies and write them back; `settings.update` saves right away.
	let level = $state<Level>(settings.value.level);
	let direction = $state(settings.value.practice.direction);
	let stepBack = $state(settings.value.practice.stepBack);
	let strictness = $state(settings.value.practice.strictness);
	let showGrade = $state(settings.value.test.showGrade);
	let sound = $state(settings.value.sound.enabled);

	// Once the stored settings have been read, show them.
	$effect(() => {
		if (!settings.loaded) return;
		const v = settings.value;
		level = v.level;
		direction = v.practice.direction;
		stepBack = v.practice.stepBack;
		strictness = v.practice.strictness;
		showGrade = v.test.showGrade;
		sound = v.sound.enabled;
	});
</script>

<svelte:head><title>Instellingen · Uiltje</title></svelte:head>

<div class="grid gap-5 lg:grid-cols-2 lg:items-start">
	<div class="lg:col-span-2">
		<h1 class="font-heading text-3xl font-semibold">Instellingen</h1>
		<p class="text-text-muted">Wijzigingen worden meteen opgeslagen.</p>
	</div>

	<div class="lg:col-span-2">
		<Segmented legend="Onderdeel van de instellingen" hideLegend options={TABS} value={shown} onchange={(t) => { tab = t; chooseTab(t); }} />
	</div>

	{#if shown === 'profiel'}
		<div class="lg:col-span-2"><ProfileSettings /></div>
	{:else if shown === 'account'}
		<div class="lg:col-span-2"><AccountSettings {user} /></div>
	{:else}
	{#if !settings.loaded}
		<SettingsSkeleton />
	{:else}
	<!-- Two stacks side by side (one stack on small screens): a short card never leaves a hole next to a tall one. -->
	<div class="flex flex-col gap-5">
		<Card rise={0} class="flex flex-col gap-4">
			<OptionGroup legend="Niveau" options={levelOptions} bind:value={level} cols={3} onchange={(v) => settings.update((d) => (d.level = v))} />
			<p class="text-sm text-text-muted">Je niveau bepaalt later hoe moeilijk vragen worden die AI voor je maakt. Het heeft geen invloed op het oefenen van je eigen rijtjes.</p>
		</Card>

		<Card rise={1} class="flex flex-col gap-4">
			<h2 class="font-heading text-lg font-semibold">Toetsen</h2>
			<Toggle
				label="Cijfer laten zien"
				description="Bij het resultaat van een toets zie je een cijfer van 1 tot 10 naast het percentage. Geslaagd is vanaf 55% (een 5,5)."
				bind:checked={showGrade}
				onchange={(v) => settings.update((d) => (d.test.showGrade = v))}
			/>
		</Card>

		<Card rise={2} class="flex flex-col gap-4">
			<h2 class="font-heading text-lg font-semibold">Geluid</h2>
			<Toggle
				label="Geluid"
				description="Zachte geluidjes bij goed, fout, een voltooid blok en een geslaagde toets."
				bind:checked={sound}
				onchange={(v) => {
					void settings.update((d) => (d.sound.enabled = v)).then(() => v && playSfx('correct'));
				}}
			/>
		</Card>
	</div>

	<div class="flex flex-col gap-5">
		<Card rise={1} class="flex flex-col gap-5">
			<h2 class="font-heading text-lg font-semibold">Oefenen: standaardkeuzes</h2>
			<p class="-mt-3 text-sm text-text-muted">Dit is wat je op het startscherm al aangevinkt ziet. Per sessie kun je het nog aanpassen.</p>
			<OptionGroup legend="Richting" options={DIRECTION_OPTIONS} bind:value={direction} cols={3} onchange={(v) => settings.update((d) => (d.practice.direction = v))} />
			<OptionGroup legend="Strengheid" options={STRICTNESS_OPTIONS} bind:value={strictness} cols={3} onchange={(v) => settings.update((d) => (d.practice.strictness = v))} />
			<OptionGroup legend="Als een blok slecht gaat" options={STEP_BACK_OPTIONS} bind:value={stepBack} cols={3} onchange={(v) => settings.update((d) => (d.practice.stepBack = v))} />
		</Card>

		<Card rise={2} class="flex flex-col gap-4">
			<h2 class="font-heading text-lg font-semibold">Uiterlijk</h2>
			<ThemePicker />
		</Card>
	</div>
	{/if}
	{/if}
</div>
