<script lang="ts">
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Icon from '../ui/Icon.svelte';
	import type { IconName } from '../ui/Icon.svelte';

	const actions: { label: string; icon: IconName; href: string; primary?: boolean }[] = [
		{ label: 'Nieuwe set', icon: 'plus', href: '/sets/new', primary: true },
		{ label: 'Importeer', icon: 'import', href: '/sets?import=cards' },
		{ label: 'Deel set', icon: 'share', href: '/sets' },
		{ label: 'Vriend toevoegen', icon: 'user-plus', href: '/friends' }
	];
</script>

<Card rise={4}>
	<h3>Snelle acties</h3>
	<ul class="mt-4 grid grid-cols-4 gap-2 xl:grid-cols-2">
		{#each actions as action (action.label)}
			<li class="flex flex-col items-center gap-2 pb-1 text-center">
				<Button href={action.href} size="lg" iconOnly variant={action.primary ? 'primary' : 'secondary'} aria-label={action.label}>
					<Icon name={action.icon} size={24} />
				</Button>
				<span class="text-xs leading-tight font-semibold text-text-muted">{action.label}</span>
			</li>
		{/each}
	</ul>
</Card>