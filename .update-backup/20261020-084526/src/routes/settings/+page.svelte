<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { PageProps } from './$types';
	import { DIRECTION_OPTIONS, STEP_BACK_OPTIONS, STRICTNESS_OPTIONS } from '#lib/components/practice/config.js';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import OptionGroup from '#lib/components/ui/OptionGroup.svelte';
	import Toggle from '#lib/components/ui/Toggle.svelte';
	import { playSfx } from '#lib/audio/sfx.js';
	import { LEVELS } from '#lib/schema/types.js';
	import type { Level } from '#lib/schema/types.js';
	import { LEVEL_LABELS } from '#lib/settings/settings.js';
	import { guestImport } from '#lib/state/guest-import.svelte.js';
	import { settings } from '#lib/state/settings.svelte.js';
	import { toasts } from '#lib/state/toast.svelte.js';
	import { displayName, username } from '#lib/utils/user.js';
	import { theme, type ThemePreference } from '#lib/state/theme.svelte.js';

	onMount(() => void settings.load());

	let { data }: PageProps = $props();
	const user = $derived(data.user);
	let signingOut = $state(false);

	// Look at this device once the page is there, so the import card knows whether it has anything to offer.
	$effect(() => {
		if (user) guestImport.check(user.id, false);
	});

	async function signOut() {
		signingOut = true;
		const { error } = await data.supabase.auth.signOut();
		signingOut = false;
		if (error) {
			toasts.show('Uitloggen is mislukt, probeer het opnieuw');
			return;
		}
		await goto('/', { invalidateAll: true });
	}

	const levelOptions = LEVELS.map((id) => ({ id, name: LEVEL_LABELS[id] }));
	const themeOptions: { id: ThemePreference; name: string; text: string }[] = [
		{ id: 'system', name: 'Automatisch', text: 'Volgt je apparaat.' },
		{ id: 'light', name: 'Licht', text: 'Warm crèmewit.' },
		{ id: 'dark', name: 'Donker', text: 'Zacht bruin, fijn \'s avonds.' }
	];

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

<div class="mx-auto flex max-w-3xl flex-col gap-5">
	<div>
		<h1 class="font-heading text-3xl font-semibold">Instellingen</h1>
		<p class="text-text-muted">Wijzigingen worden meteen opgeslagen.</p>
	</div>

	<Card class="flex flex-col gap-4">
		<h2 class="font-heading text-lg font-semibold">Account</h2>
		{#if user}
			<div class="flex flex-wrap items-center justify-between gap-3">
				<p class="min-w-0 text-text-muted">
					Ingelogd als <strong class="text-text">{displayName(user)}</strong> (@{username(user)}). Je sets, voortgang en instellingen staan in je account.
				</p>
				<Button variant="secondary" class="min-w-28" disabled={signingOut} onclick={signOut}>
					{signingOut ? 'Bezig…' : 'Uitloggen'}
				</Button>
			</div>
			{#if guestImport.hasData}
				<div class="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
					<p class="min-w-0 text-text-muted">
						Op dit apparaat staan nog gastgegevens ({guestImport.found?.sets ?? 0} sets). Zet ze over naar je account.
					</p>
					<Button variant="sage" class="min-w-28" onclick={() => (guestImport.open = true)}>Overzetten</Button>
				</div>
			{/if}
		{:else}
			<div class="flex flex-wrap items-center justify-between gap-3">
				<p class="min-w-0 text-text-muted">Je gebruikt Uiltje als gast: alles staat alleen op dit apparaat. Log in om je sets overal te hebben.</p>
				<Button href="/login" class="min-w-28">Inloggen</Button>
			</div>
		{/if}
	</Card>

	<Card class="flex flex-col gap-4">
		<OptionGroup legend="Niveau" options={levelOptions} bind:value={level} cols={3} onchange={(v) => settings.update((d) => (d.level = v))} />
		<p class="text-sm text-text-muted">Je niveau bepaalt later hoe moeilijk vragen worden die AI voor je maakt. Het heeft geen invloed op het oefenen van je eigen rijtjes.</p>
	</Card>

	<Card class="flex flex-col gap-5">
		<h2 class="font-heading text-lg font-semibold">Oefenen: standaardkeuzes</h2>
		<p class="-mt-3 text-sm text-text-muted">Dit is wat je op het startscherm al aangevinkt ziet. Per sessie kun je het nog aanpassen.</p>
		<OptionGroup legend="Richting" options={DIRECTION_OPTIONS} bind:value={direction} cols={3} onchange={(v) => settings.update((d) => (d.practice.direction = v))} />
		<OptionGroup legend="Strengheid" options={STRICTNESS_OPTIONS} bind:value={strictness} cols={3} onchange={(v) => settings.update((d) => (d.practice.strictness = v))} />
		<OptionGroup legend="Als een blok slecht gaat" options={STEP_BACK_OPTIONS} bind:value={stepBack} cols={3} onchange={(v) => settings.update((d) => (d.practice.stepBack = v))} />
	</Card>

	<Card class="flex flex-col gap-4">
		<h2 class="font-heading text-lg font-semibold">Toetsen</h2>
		<Toggle
			label="Cijfer laten zien"
			description="Bij het resultaat van een toets zie je een cijfer van 1 tot 10 naast het percentage. Geslaagd is vanaf 55% (een 5,5)."
			bind:checked={showGrade}
			onchange={(v) => settings.update((d) => (d.test.showGrade = v))}
		/>
	</Card>

	<Card class="flex flex-col gap-4">
		<h2 class="font-heading text-lg font-semibold">Geluid en uiterlijk</h2>
		<Toggle
			label="Geluid"
			description="Zachte geluidjes bij goed, fout, een voltooid blok en een geslaagde toets."
			bind:checked={sound}
			onchange={(v) => {
				void settings.update((d) => (d.sound.enabled = v)).then(() => v && playSfx('correct'));
			}}
		/>
		<OptionGroup legend="Thema" options={themeOptions} value={theme.preference} cols={3} onchange={(v) => theme.set(v)} />
	</Card>
</div>
