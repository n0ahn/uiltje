<script lang="ts">
	import { onMount } from 'svelte';
	import { theme } from '../../state/theme.svelte';
	import Button from '../ui/Button.svelte';
	import Icon from '../ui/Icon.svelte';

	onMount(() => theme.init());
	const dark = $derived(theme.resolved === 'dark');
</script>

<Button
	variant="secondary"
	size="sm"
	iconOnly
	aria-label={dark ? 'Schakel naar licht thema' : 'Schakel naar donker thema'}
	onclick={() => theme.toggle()}
>
	<Icon name={dark ? 'sun' : 'moon'} size={18} />
</Button>