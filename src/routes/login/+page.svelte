<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import Owl from '#lib/components/ui/Owl.svelte';
	import Segmented from '#lib/components/ui/Segmented.svelte';
	import ThemeToggle from '#lib/components/shell/ThemeToggle.svelte';

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
	// Invite and share pages send people here with ?next=/i/..., so they land back where they came from.
	const next = (() => {
		const n = page.url.searchParams.get('next') ?? '/';
		return n.startsWith('/') && !n.startsWith('//') ? n : '/';
	})();
	let showPassword = $state(false);
	let busy = $state(false);
	let error = $state(page.url.searchParams.has('error') ? 'Inloggen mislukt, probeer het opnieuw.' : '');
	let message = $state('');

	const modes = [
		{ id: 'in', name: 'Inloggen' },
		{ id: 'up', name: 'Registreren' }
	] as const;

	async function oauth(provider: 'github' | 'google') {
		error = '';
		const { error: err } = await data.supabase.auth.signInWithOAuth({
			provider,
			options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` }
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
			else await goto(next, { invalidateAll: true });
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
			// E-mail confirmation is switched off in Supabase, so signUp returns a session: go straight in.
			const { data: signedUp, error: err } = await data.supabase.auth.signUp({
				email,
				password,
				options: { data: { display_name: displayName.trim(), username: name } }
			});
			if (err) error = 'Registreren mislukt. Gebruik een geldig e-mailadres en minimaal 6 tekens.';
			else if (signedUp.session) await goto(next, { invalidateAll: true });
			else error = 'Dit e-mailadres heeft al een account. Log in.';
		}
		busy = false;
	}
</script>

<svelte:head>
	<title>Inloggen · Uiltje</title>
</svelte:head>

<!-- One screen, no scrolling in login mode: a compact card centred on the normal app background. -->
<main class="mx-auto flex min-h-dvh w-full max-w-100 flex-col justify-center px-4 py-4">
	<Card padded={false} class="relative p-5">
		<div class="absolute top-4 right-4"><ThemeToggle /></div>

		<header class="flex items-center gap-3 pr-12">
			<Owl pose={busy ? 'thinking' : 'idle'} size={56} />
			<div class="min-w-0">
				<h1 class="font-heading text-3xl font-bold">Uiltje</h1>
				<p class="mt-1 hidden text-sm text-text-muted sm:block">Je leercompagnon voor rijtjes en regels.</p>
			</div>
		</header>

		<div class="mt-4 flex flex-col gap-4">
			<Segmented
				legend="Inloggen of registreren"
				hideLegend
				options={modes}
				bind:value={mode}
				onchange={() => {
					error = '';
					message = '';
					showPassword = false;
				}}
			/>

			{#if providers.some((p) => p.enabled)}
				<div class="flex flex-col gap-3">
					{#each providers.filter((p) => p.enabled) as p (p.id)}
						<Button type="button" variant="secondary" class="w-full" onclick={() => oauth(p.id)}>
							{#if p.id === 'github'}
									<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
										<path
											d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
										/>
									</svg>
								{:else}
									<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
										<path
											d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
										/>
									</svg>
								{/if}
								{p.label}
						</Button>
					{/each}
				</div>

				<div class="flex items-center gap-3 text-sm font-semibold text-text-muted" aria-hidden="true">
					<span class="h-0.5 flex-1 rounded-full bg-border"></span>
					of
					<span class="h-0.5 flex-1 rounded-full bg-border"></span>
				</div>
			{/if}

			<form class="flex flex-col gap-3" onsubmit={submit}>
				{#if mode === 'up'}
					<Input label="Weergavenaam" maxlength={40} autocomplete="name" required bind:value={displayName} />
					<Input
						label="Gebruikersnaam"
						minlength={3}
						maxlength={20}
						pattern="[a-zA-Z0-9_]+"
						autocapitalize="none"
						autocomplete="username"
						spellcheck={false}
						required
						bind:value={username}
					/>
				{/if}
				<Input label="E-mailadres" type="email" autocomplete="email" required bind:value={email} />
				<div class="relative">
					<Input
						label="Wachtwoord"
						type={showPassword ? 'text' : 'password'}
						autocomplete={mode === 'in' ? 'current-password' : 'new-password'}
						minlength={6}
						required
						class="[&_input]:pr-12"
						bind:value={password}
					/>
					<button
						type="button"
						class="absolute right-1 bottom-1 grid size-10 cursor-pointer place-items-center rounded-tile text-text-muted transition-colors duration-150 hover:text-text"
						aria-label={showPassword ? 'Verberg wachtwoord' : 'Toon wachtwoord'}
						aria-pressed={showPassword}
						onclick={() => (showPassword = !showPassword)}
					>
						<Icon name={showPassword ? 'eye-off' : 'eye'} size={20} />
					</button>
				</div>

				<Button type="submit" class="w-full" disabled={busy}>
					{busy ? 'Bezig…' : mode === 'in' ? 'Inloggen' : 'Account maken'}
				</Button>
				<!-- Reserved slot: an error or a notice appears here without moving the buttons. -->
				<div class="min-h-11">
					{#if message}
						<p role="status" class="flex items-center gap-2.5 rounded-input border-2 border-sage bg-sage-soft py-1 pr-3 pl-2 text-sm font-semibold text-text">
							<Owl pose="happy" size={28} />
							<span>{message}</span>
						</p>
					{:else if error}
						<p role="alert" class="flex items-center gap-2.5 rounded-input border-2 border-rose bg-rose-soft py-1 pr-3 pl-2 text-sm font-semibold text-text">
							<Owl pose="oops" size={28} />
							<span>{error}</span>
						</p>
					{/if}
				</div>
			</form>

			<Button href="/" variant="ghost" class="-mt-1 self-center">Verder als gast</Button>
		</div>
	</Card>
</main>
