<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();

	// Flip `enabled` per provider once it is configured in Supabase.
	const providers = [
		{ id: 'github', label: 'Doorgaan met GitHub', enabled: true },
		{ id: 'google', label: 'Doorgaan met Google', enabled: false }
	] as const;

	let mode = $state<'in' | 'up'>('in');
	let email = $state('');
	let password = $state('');
	let displayName = $state('');
	let username = $state('');
	let busy = $state(false);
	let error = $state(page.url.searchParams.has('error') ? 'Inloggen mislukt, probeer het opnieuw.' : '');
	let message = $state('');

	async function oauth(provider: 'github' | 'google') {
		error = '';
		const { error: err } = await data.supabase.auth.signInWithOAuth({
			provider,
			options: { redirectTo: `${location.origin}/auth/callback` }
		});
		if (err) error = 'Inloggen mislukt, probeer het opnieuw.';
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		error = '';
		message = '';

		if (mode === 'in') {
			const { error: err } = await data.supabase.auth.signInWithPassword({ email, password });
			if (err) error = 'E-mailadres of wachtwoord klopt niet.';
			else await goto('/', { invalidateAll: true });
		} else {
			const name = username.trim().toLowerCase();
			if (!/^[a-z0-9_]{3,20}$/.test(name)) {
				error = 'Gebruikersnaam: 3–20 tekens, alleen letters, cijfers en _.';
				busy = false;
				return;
			}
			const { data: free } = await data.supabase.rpc('username_available', { name });
			if (!free) {
				error = 'Die gebruikersnaam is al bezet.';
				busy = false;
				return;
			}
			const { error: err } = await data.supabase.auth.signUp({
				email,
				password,
				options: {
					emailRedirectTo: `${location.origin}/auth/callback`,
					data: { display_name: displayName.trim(), username: name }
				}
			});
			if (err) error = 'Registreren mislukt. Gebruik een geldig e-mailadres en minimaal 6 tekens.';
			else message = 'Check je e-mail en klik op de link om je account te bevestigen.';
		}
		busy = false;
	}
</script>

<main class="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
	<h1 class="text-3xl font-bold">Uiltje</h1>

	<div class="flex flex-col gap-2">
		{#each providers.filter((p) => p.enabled) as p (p.id)}
			<button type="button" class="rounded-xl border px-4 py-2" onclick={() => oauth(p.id)}>
				{p.label}
			</button>
		{/each}
	</div>

	<form class="flex flex-col gap-3" onsubmit={submit}>
		{#if mode === 'up'}
			<label class="flex flex-col gap-1">
				<span>Weergavenaam</span>
				<input class="rounded-xl border px-3 py-2" maxlength="40" required bind:value={displayName} />
			</label>
			<label class="flex flex-col gap-1">
				<span>Gebruikersnaam</span>
				<input
					class="rounded-xl border px-3 py-2"
					minlength="3"
					maxlength="20"
					pattern="[a-zA-Z0-9_]+"
					autocapitalize="none"
					required
					bind:value={username}
				/>
			</label>
		{/if}
		<label class="flex flex-col gap-1">
			<span>E-mailadres</span>
			<input class="rounded-xl border px-3 py-2" type="email" autocomplete="email" required bind:value={email} />
		</label>
		<label class="flex flex-col gap-1">
			<span>Wachtwoord</span>
			<input
				class="rounded-xl border px-3 py-2"
				type="password"
				autocomplete={mode === 'in' ? 'current-password' : 'new-password'}
				minlength="6"
				required
				bind:value={password}
			/>
		</label>
		<button class="rounded-xl border px-4 py-2" disabled={busy}>
			{mode === 'in' ? 'Inloggen' : 'Account maken'}
		</button>
		<button
			type="button"
			class="text-sm underline"
			onclick={() => {
				mode = mode === 'in' ? 'up' : 'in';
				error = '';
				message = '';
			}}
		>
			{mode === 'in' ? 'Nog geen account? Registreren' : 'Al een account? Inloggen'}
		</button>
	</form>

	{#if error}<p role="alert" class="text-red-600">{error}</p>{/if}
	{#if message}<p role="status">{message}</p>{/if}

	<a class="text-sm underline" href="/">Verder als gast</a>
</main>