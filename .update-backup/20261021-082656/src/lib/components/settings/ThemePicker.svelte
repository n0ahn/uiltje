<script lang="ts">
	import { THEMES, theme, type ThemePreference } from '../../state/theme.svelte';
	import Icon from '../ui/Icon.svelte';

	// Radio tiles with a little preview of each theme. The preview scopes the theme with data-theme on the tile,
	// so it always shows the real colors. Native radios: arrow keys and screen readers work.
	const uid = $props.id();
	const name = `theme-${uid}`;

	const GROUPS = [
		{ label: 'Licht', themes: THEMES.filter((t) => t.mode === 'light') },
		{ label: 'Donker', themes: THEMES.filter((t) => t.mode === 'dark') }
	];

	const chosen = $derived(theme.preference);
	const chosenText = $derived(
		chosen === 'system'
			? 'Volgt je apparaat: licht overdag, donker \'s avonds.'
			: (THEMES.find((t) => t.id === chosen)?.text ?? '')
	);

	function choose(id: ThemePreference) {
		theme.set(id);
	}
</script>

{#snippet tile(id: ThemePreference, label: string, preview: 'single' | 'split', themeId?: string)}
	<label
		class={[
			'group relative flex cursor-pointer flex-col gap-2 rounded-tile border-2 p-2 transition-colors duration-150 has-focus-visible:outline-3 has-focus-visible:outline-primary/50',
			chosen === id ? 'border-primary bg-primary-soft' : 'border-border hover:border-primary/60'
		]}
	>
		<input type="radio" class="sr-only" {name} value={id} checked={chosen === id} onchange={() => choose(id)} />
		{#if preview === 'split'}
			<span class="flex h-14 overflow-hidden rounded-[10px] border border-border" aria-hidden="true">
				<span class="flex-1" data-theme={theme.pair.light}><span class="block size-full bg-bg p-1.5"><span class="block h-full rounded-md bg-surface"></span></span></span>
				<span class="flex-1" data-theme={theme.pair.dark}><span class="block size-full bg-bg p-1.5"><span class="block h-full rounded-md bg-surface"></span></span></span>
			</span>
		{:else}
			<span class="block h-14 overflow-hidden rounded-[10px] border border-border" data-theme={themeId} aria-hidden="true">
				<span class="flex size-full flex-col gap-1 bg-bg p-1.5">
					<span class="flex flex-1 items-center gap-1.5 rounded-md bg-surface px-1.5">
						<span class="size-3.5 rounded-full bg-primary-btn"></span>
						<span class="h-1.5 flex-1 rounded-full bg-surface-2"></span>
					</span>
					<span class="flex gap-1"><span class="h-2 flex-1 rounded-full bg-sage"></span><span class="h-2 flex-1 rounded-full bg-surface-2"></span></span>
				</span>
			</span>
		{/if}
		<span class="px-0.5 font-heading text-sm font-semibold">{label}</span>
		{#if chosen === id}
			<span class="absolute top-3 right-3 grid size-5 animate-[badge-pop_320ms_var(--ease-spring)] place-items-center rounded-full bg-primary-btn text-on-primary" aria-hidden="true">
				<Icon name="check" size={12} />
			</span>
		{/if}
	</label>
{/snippet}

<fieldset class="flex flex-col gap-4">
	<legend class="sr-only">Thema</legend>
	<div class="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
		{@render tile('system', 'Automatisch', 'split')}
	</div>
	{#each GROUPS as group (group.label)}
		<div>
			<p class="mb-2 text-sm font-semibold text-text-muted">{group.label}</p>
			<div class="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
				{#each group.themes as t (t.id)}
					{@render tile(t.id, t.name, 'single', t.id)}
				{/each}
			</div>
		</div>
	{/each}
	<p class="text-sm text-text-muted" aria-live="polite">{chosenText}</p>
</fieldset>
