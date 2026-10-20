<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Person } from '../../social/types';
	import Avatar from '../ui/Avatar.svelte';

	/** One person: photo, name, @username and an optional action area on the right. */
	type Props = { person: Person; note?: string; actions?: Snippet; size?: number; /** Makes the name a link (to the profile). */ href?: string };
	let { person, note, actions, size = 40, href }: Props = $props();
</script>

<div class="relative flex min-w-0 items-center gap-3">
	<Avatar name={person.displayName} src={person.avatarUrl} {size} />
	<div class="min-w-0 flex-1">
		<p class="truncate font-semibold">
			{#if href}<a {href} class="after:absolute after:inset-0 after:content-[''] hover:underline">{person.displayName}</a>{:else}{person.displayName}{/if}
		</p>
		<p class="truncate text-sm text-text-muted">@{person.username}{note ? ` · ${note}` : ''}</p>
	</div>
	{#if actions}<div class="relative z-10 flex shrink-0 items-center gap-2">{@render actions()}</div>{/if}
</div>
