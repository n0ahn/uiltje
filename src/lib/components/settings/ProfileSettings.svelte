<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import ProfileSkeleton from '../skeleton/ProfileSkeleton.svelte';
	import Avatar from '../ui/Avatar.svelte';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Icon from '../ui/Icon.svelte';
	import Input from '../ui/Input.svelte';
	import Toggle from '../ui/Toggle.svelte';
	import { getSocial } from '../../social/index.js';
	import { AVATAR_MAX_INPUT_BYTES, checkAvatarFile, shrinkAvatar } from '../../social/avatar-image.js';
	import type { MyProfile } from '../../social/types.js';
	import { profile } from '../../state/profile.svelte.js';
	import { toasts } from '../../state/toast.svelte.js';
	import { StorageError } from '../../storage/adapter.js';

	let fileInput: HTMLInputElement | undefined = $state();
	/** A chosen photo that is shrunk and waiting for "Opslaan". */
	let pending = $state<{ blob: Blob; preview: string } | null>(null);
	let photoBusy = $state(false);
	let photoError = $state('');

	let displayName = $state('');
	let username = $state('');
	let saving = $state(false);
	let saveError = $state('');

	onMount(() => void profile.load());
	onDestroy(() => clearPending());

	// Fill the fields once the profile is there (and again after a save).
	$effect(() => {
		const p = profile.data;
		if (!p) return;
		displayName = p.displayName;
		username = p.username;
	});

	const dirty = $derived(!!profile.data && (displayName.trim() !== profile.data.displayName || username.trim().toLowerCase() !== profile.data.username));

	function clearPending() {
		if (pending) URL.revokeObjectURL(pending.preview);
		pending = null;
	}

	async function pick(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = ''; // the same file can be chosen again
		if (!file) return;
		photoError = checkAvatarFile(file) ?? '';
		if (photoError) return;
		try {
			const blob = await shrinkAvatar(file);
			clearPending();
			pending = { blob, preview: URL.createObjectURL(blob) };
		} catch (e) {
			photoError = e instanceof Error ? e.message : 'Deze foto kan niet worden verwerkt.';
		}
	}

	async function run<T extends MyProfile>(job: () => Promise<T>, onError: (message: string) => void): Promise<boolean> {
		try {
			profile.set(await job());
			return true;
		} catch (e) {
			onError(e instanceof StorageError ? e.message : 'Er ging iets mis. Probeer het opnieuw.');
			return false;
		}
	}

	async function savePhoto() {
		if (!pending || photoBusy) return;
		photoBusy = true;
		photoError = '';
		const blob = pending.blob;
		if (await run(() => getSocial().uploadAvatar(blob), (m) => (photoError = m))) {
			clearPending();
			toasts.show('Je profielfoto is opgeslagen');
		}
		photoBusy = false;
	}

	async function removePhoto() {
		if (photoBusy) return;
		photoBusy = true;
		photoError = '';
		if (await run(() => getSocial().removeAvatar(), (m) => (photoError = m))) toasts.show('Je profielfoto is verwijderd');
		photoBusy = false;
	}

	async function saveNames(e: SubmitEvent) {
		e.preventDefault();
		if (!dirty || saving) return;
		saving = true;
		saveError = '';
		if (await run(() => getSocial().updateProfile({ displayName, username }), (m) => (saveError = m))) {
			await invalidate('supabase:auth'); // the header reads the name from the sign-in data
			toasts.show('Je profiel is opgeslagen');
		}
		saving = false;
	}

	async function setLeaderboard(show: boolean) {
		await run(() => getSocial().updateProfile({ showOnLeaderboard: show }), (m) => toasts.show(m));
	}
</script>

{#if profile.failed && !profile.data}
	<Card class="flex flex-col items-start gap-3">
		<p>Je profiel laden lukt niet. Controleer je internetverbinding en probeer het opnieuw.</p>
		<Button variant="secondary" onclick={() => void profile.load()}>Opnieuw proberen</Button>
	</Card>
{:else if !profile.data}
	<ProfileSkeleton />
{:else}
	{@const me = profile.data}
	<div class="grid gap-5 lg:grid-cols-2 lg:items-start">
		<Card class="flex flex-col gap-4 sm:flex-row sm:items-center lg:col-span-2">
			<Avatar name={me.displayName} src={pending?.preview ?? me.avatarUrl} size={112} />
			<div class="flex min-w-0 flex-1 flex-col gap-3">
				<div>
					<h2 class="font-heading text-lg font-semibold">Profielfoto</h2>
					<p class="text-sm text-text-muted">JPG, PNG of WebP, maximaal {AVATAR_MAX_INPUT_BYTES / 1024 / 1024} MB. Wordt vierkant bijgesneden en verkleind.</p>
				</div>
				<input bind:this={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="sr-only" tabindex="-1" aria-label="Profielfoto kiezen" onchange={pick} />
				<div class="flex flex-wrap gap-3">
					{#if pending}
						<Button class="min-w-32" disabled={photoBusy} onclick={savePhoto}>{photoBusy ? 'Bezig…' : 'Foto opslaan'}</Button>
						<Button variant="ghost" disabled={photoBusy} onclick={clearPending}>Annuleren</Button>
					{:else}
						<Button variant="secondary" disabled={photoBusy} onclick={() => fileInput?.click()}><Icon name="pencil" size={18} /> {me.avatarUrl ? 'Andere foto' : 'Foto kiezen'}</Button>
						{#if me.avatarUrl}
							<Button variant="ghost" disabled={photoBusy} onclick={removePhoto}><Icon name="trash" size={18} /> Verwijderen</Button>
						{/if}
					{/if}
				</div>
				<p class="min-h-6 text-sm font-semibold text-rose-edge" role="alert">{photoError}</p>
			</div>
		</Card>

		<Card class="flex flex-col gap-4">
			<h2 class="font-heading text-lg font-semibold">Naam</h2>
			<form class="flex flex-col gap-4" onsubmit={saveNames}>
				<Input label="Weergavenaam" bind:value={displayName} maxlength={40} required autocomplete="name" />
				<Input label="Gebruikersnaam" bind:value={username} maxlength={20} required autocomplete="username" autocapitalize="none" spellcheck={false} />
				<p class="-mt-2 text-sm text-text-muted">Vrienden vinden je met je gebruikersnaam: 3–20 tekens, letters, cijfers en _.</p>
				<div class="flex flex-wrap items-center gap-3">
					<Button type="submit" class="min-w-32" disabled={!dirty || saving}>{saving ? 'Bezig…' : 'Opslaan'}</Button>
					<p class="min-h-6 min-w-0 flex-1 text-sm font-semibold text-rose-edge" role="alert">{saveError}</p>
				</div>
			</form>
		</Card>

		<Card class="flex flex-col gap-4">
			<h2 class="font-heading text-lg font-semibold">Privacy</h2>
			<Toggle
				label="Laat mijn statistieken zien aan vrienden"
				description="Vrienden zien je op de ranglijst en je statistieken op je profiel: aantallen, nauwkeurigheid en je reeks. Nooit je antwoorden. Zet je dit uit, dan zien zij jou niet op de ranglijst en houdt je profiel je statistieken privé; jij ziet ze zelf nog wel."
				checked={me.showOnLeaderboard}
				onchange={setLeaderboard}
			/>
			<p class="text-sm text-text-muted">Welke sets vrienden zien, kies je per set in de editor: openbaar of privé. Je e-mailadres is voor niemand zichtbaar.</p>
			<div><Button variant="secondary" href="/profile"><Icon name="user" size={18} /> Mijn profiel bekijken</Button></div>
		</Card>
	</div>
{/if}
