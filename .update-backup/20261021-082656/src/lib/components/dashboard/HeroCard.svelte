<script lang="ts">
	import type { RecentPractice } from '../../dashboard/data';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Deco from '../ui/Deco.svelte';
	import Icon from '../ui/Icon.svelte';
	import Owl from '../ui/Owl.svelte';
	import ProgressBar from '../ui/ProgressBar.svelte';
	import Skeleton from '../ui/Skeleton.svelte';
	import HeroScene from './HeroScene.svelte';

	/** `loading`: the overview is not there yet, so show an empty card instead of the "nothing practised" message. */
	type Props = { recent: RecentPractice | null; loading?: boolean };
	let { recent, loading = false }: Props = $props();
</script>

<Card padded={false} rise={0} class="relative min-h-55 overflow-hidden">
	{#if recent}
		<div class="relative z-10 flex min-h-55 flex-col justify-center gap-3 p-6 sm:max-w-[62%] sm:p-8">
			<p class="text-sm font-semibold text-text-muted">Verder waar je was</p>
			<h2 class="text-2xl sm:text-[1.7rem]">{recent.title}</h2>
			<div class="max-w-xs">
				<p class="mb-1.5 text-sm font-semibold">{Math.round(recent.mastered * 100)}% onder de knie</p>
				<ProgressBar value={recent.mastered} accent="primary" label="Voortgang van deze set" />
			</div>
			<div class="mt-2 flex flex-wrap gap-3 pb-1">
				<Button href={recent.href}>
					<Icon name="play" size={16} /> Verder oefenen
				</Button>
				<Button variant="secondary" href={recent.setHref}>Naar de set</Button>
			</div>
		</div>
		<!-- illustration fades in from the left so it blends into the card -->
		<HeroScene class="scene absolute inset-y-0 right-0 hidden h-full w-[58%] sm:block" />
		<Deco kind="sparkle" size={18} class="absolute top-5 right-[52%] z-10 hidden sm:block" />
		<Deco kind="sparkle" size={12} delay={1.2} class="absolute right-6 bottom-5 z-10 hidden sm:block" />
	{:else if loading}
		<div class="flex min-h-55 flex-col justify-center gap-3 p-6 sm:max-w-[62%] sm:p-8" role="status" aria-busy="true">
			<span class="sr-only">Laden…</span>
			<Skeleton class="h-4 w-32" />
			<Skeleton class="h-8 w-3/4" />
			<Skeleton class="h-3 w-full max-w-xs" />
			<div class="mt-2 flex gap-3"><Skeleton class="h-11 w-40" /><Skeleton class="h-11 w-32" /></div>
		</div>
	{:else}
		<div class="flex min-h-55 flex-col items-center justify-center gap-3 p-8 text-center">
			<Owl pose="sleepy" size={96} bob />
			<p class="font-heading text-lg font-medium">Je hebt nog niets geoefend.</p>
			<Button href="/sets/new">Maak je eerste set</Button>
		</div>
	{/if}
</Card>

<style>
	:global(.scene) {
		-webkit-mask-image: linear-gradient(to right, transparent, black 38%);
		mask-image: linear-gradient(to right, transparent, black 38%);
	}
</style>