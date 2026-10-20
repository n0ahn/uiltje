<script lang="ts">
	import Dropdown from '../ui/Dropdown.svelte';
	import Icon from '../ui/Icon.svelte';
	import MenuItem from '../ui/MenuItem.svelte';

	// The "Oefenen" button with the kinds of practice (like StudyGo). Every entry opens the practice route with `?mode=`.
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
		<MenuItem href="{href}?mode=dictation" icon="ear">Dictee</MenuItem>
		<MenuItem href="{href}?mode=spelling" icon="spelling">Spelling</MenuItem>
		<MenuItem href="{href}?mode=hints" icon="bulb">Hints</MenuItem>
		<MenuItem href="{href}?mode=choice" icon="list">Meerkeuze</MenuItem>
		<MenuItem href="{href}?mode=flashcards" icon="cards">Flashcards</MenuItem>
	</Dropdown>
{/if}
