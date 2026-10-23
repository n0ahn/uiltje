<script lang="ts">
	import Dropdown from '../ui/Dropdown.svelte';
	import Icon from '../ui/Icon.svelte';
	import MenuItem from '../ui/MenuItem.svelte';

	// The "Oefenen" button with the kinds of practice (like StudyGo). Every entry opens the practice route with `?mode=`.
	// `extra` is appended to every link (e.g. "&selection=1"); `onbeforestart` runs on the click, before the page changes.
	type Props = {
		href: string;
		size?: 'sm' | 'md' | 'lg';
		label?: string;
		disabled?: boolean;
		extra?: string;
		onbeforestart?: () => void;
		/** Show "Uitleggen": only for sets that have lists of begrippen (stijlfiguren, grammatica). */
		explain?: boolean;
	};
	let { href, size = 'lg', label = 'Oefenen', disabled = false, extra = '', onbeforestart, explain = false }: Props = $props();
</script>

{#if disabled}
	<button type="button" class="btn" data-size={size} disabled><Icon name="play" size={20} /> {label}</button>
{:else}
	<Dropdown label="{label}: kies hoe je wilt oefenen" {size}>
		{#snippet trigger()}<Icon name="play" size={20} /> {label}{/snippet}
		<MenuItem href="{href}?mode=learn{extra}" onclick={onbeforestart} icon="repeat" badge="Aanbevolen">Leren</MenuItem>
		<MenuItem href="{href}?mode=test{extra}" onclick={onbeforestart} icon="pencil">Toets</MenuItem>
		<MenuItem href="{href}?mode=dictation{extra}" onclick={onbeforestart} icon="ear">Dictee</MenuItem>
		<MenuItem href="{href}?mode=spelling{extra}" onclick={onbeforestart} icon="spelling">Spelling</MenuItem>
		<MenuItem href="{href}?mode=hints{extra}" onclick={onbeforestart} icon="bulb">Hints</MenuItem>
		<MenuItem href="{href}?mode=choice{extra}" onclick={onbeforestart} icon="list">Meerkeuze</MenuItem>
		<MenuItem href="{href}?mode=flashcards{extra}" onclick={onbeforestart} icon="cards">Flashcards</MenuItem>
		{#if explain}<MenuItem href="{href}?mode=explain{extra}" onclick={onbeforestart} icon="bulb" badge="Nieuw">Uitleggen</MenuItem>{/if}
	</Dropdown>
{/if}
