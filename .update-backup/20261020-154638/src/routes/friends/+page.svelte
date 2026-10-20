<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Chip from '#lib/components/ui/Chip.svelte';
	import Deco from '#lib/components/ui/Deco.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import type { IconName } from '#lib/components/ui/Icon.svelte';
	import Owl from '#lib/components/ui/Owl.svelte';

	// Placeholder until phase 6 (friends + leaderboard). Static page: no data loading, so no skeleton.
	const teasers: { icon: IconName; title: string; text: string }[] = [
		{ icon: 'users', title: 'Vrienden uitnodigen', text: 'Stuur een uitnodigingslink en jullie zijn meteen verbonden.' },
		{ icon: 'trophy', title: 'Ranglijst', text: 'Zie wie er deze week de meeste onderdelen onder de knie heeft.' },
		{ icon: 'copy', title: 'Sets delen', text: 'Deel een set met een link. Je vriend krijgt een eigen kopie.' }
	];
</script>

<svelte:head><title>Vrienden · Uiltje</title></svelte:head>

<h1 class="mb-6 font-heading text-3xl font-semibold">Vrienden</h1>

<div class="mx-auto flex max-w-2xl flex-col items-center gap-8 py-10 text-center">
	<div class="relative">
		<Deco kind="sparkle" size={22} class="absolute -top-2 -left-8" />
		<Deco kind="sparkle" size={14} delay={1.2} class="absolute top-6 -right-9" />
		<Owl pose="sleepy" size={120} label="Uiltje slaapt nog even" />
	</div>

	<div class="flex flex-col items-center gap-3">
		<Chip active>Binnenkort</Chip>
		<h2 class="font-heading text-2xl font-semibold">Vrienden komt eraan</h2>
		<p class="max-w-md text-text-muted">
			Uiltje is nog bezig met deze pagina. Straks kun je hier vrienden uitnodigen, sets delen en samen de ranglijst beklimmen.
		</p>
	</div>

	<ul class="grid w-full gap-4 text-left sm:grid-cols-3">
		{#each teasers as teaser (teaser.title)}
			<li>
				<Card class="h-full">
					<span class="grid size-10 place-items-center rounded-tile bg-surface-2 text-text-muted">
						<Icon name={teaser.icon} size={22} />
					</span>
					<h3 class="mt-3 font-heading text-lg font-semibold">{teaser.title}</h3>
					<p class="mt-1 text-sm text-text-muted">{teaser.text}</p>
				</Card>
			</li>
		{/each}
	</ul>

	<Button href="/">Terug naar home</Button>
</div>
