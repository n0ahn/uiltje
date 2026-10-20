<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Person } from '../../social/types';
	import Avatar from '../ui/Avatar.svelte';

	/** One person: photo, name, @username and an optional action area on the right. */
	type Props = { person: Person; note?: string; actions?: Snippet; size?: number };
	let { person, note, actions, size = 40 }: Props = $props();
</script>

<div class="flex min-w-0 items-center gap-3">
	<Avatar name={person.displayName} src={person.avatarUrl} {size} />
	<div class="min-w-0 flex-1">
		<p class="truncate font-semibold">{person.displayName}</p>
		<p class="truncate text-sm text-text-muted">@{person.username}{note ? ` · ${note}` : ''}</p>
	</div>
	{#if actions}<div class="flex shrink-0 items-center gap-2">{@render actions()}</div>{/if}
</div>
