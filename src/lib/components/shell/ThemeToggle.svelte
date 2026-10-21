<script lang="ts">
	import { onMount } from 'svelte';
	import { theme } from '../../state/theme.svelte';
	import Button from '../ui/Button.svelte';
	import Icon from '../ui/Icon.svelte';

	onMount(() => theme.init());
	const dark = $derived(theme.mode === 'dark');
</script>

<Button
	variant="secondary"
	size="sm"
	iconOnly
	aria-label={dark ? 'Schakel naar licht thema' : 'Schakel naar donker thema'}
	onclick={() => theme.toggle()}
>
	<!-- The icon turns in when the mode changes: sun and moon take each other's place. -->
	{#key dark}
		<span class="grid animate-[icon-swap_480ms_var(--ease-spring)] place-items-center">
			<Icon name={dark ? 'sun' : 'moon'} size={18} />
		</span>
	{/key}
</Button>
