<script lang="ts">
	import Dropdown from '../ui/Dropdown.svelte';
	import Icon from '../ui/Icon.svelte';
	import MenuItem from '../ui/MenuItem.svelte';

	// The "Oefenen" button with the kinds of practice (like StudyGo). Leren and Toets work; the rest is on its way.
	type Props = { href: string; size?: 'sm' | 'md' | 'lg'; label?: string; disabled?: boolean };
	let { href, size = 'lg', label = 'Oefenen', disabled = false }: Props = $props();
</script>

{#if disabled}
	<button type="button" class="btn" data-size={size} disabled><Icon name="play" size={20} /> {label}</button>
{:else}
	<Dropdown label="{label}: kies hoe je wilt oefenen" {size}>
		{#snippet trigger()}<Icon name="play" size={20} /> {label}{/snippet}
		<MenuItem href="{href}?mode=learn" icon="repeat" badge="Aanbevolen">Leren</MenuItem>
		<MenuItem href="{href}?mode=test" icon="pencil">Toets</MenuItem>
		<MenuItem soon icon="ear">Dictee</MenuItem>
		<MenuItem soon icon="spelling">Spelling</MenuItem>
		<MenuItem soon icon="bulb">Hints</MenuItem>
		<MenuItem soon icon="list">Meerkeuze</MenuItem>
		<MenuItem soon icon="cards">Flashcards</MenuItem>
	</Dropdown>
{/if}