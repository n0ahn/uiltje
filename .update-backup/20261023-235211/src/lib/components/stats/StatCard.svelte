<script lang="ts">
	import Card from '../ui/Card.svelte';
	import Icon, { type IconName } from '../ui/Icon.svelte';

	type Props = { label: string; value: string; note?: string; icon: IconName; iconClass?: string };
	let { label, value, note, icon, iconClass = 'text-text-muted' }: Props = $props();
</script>

<Card class="flex flex-col gap-1">
	<p class="flex items-center gap-2 text-sm font-semibold text-text-muted">
		<Icon name={icon} size={18} class={iconClass} />
		{label}
	</p>
	<p class="font-heading text-3xl font-bold">{value}</p>
	<p class="min-h-5 text-sm text-text-muted">{note ?? ''}</p>
</Card>
