<script lang="ts">
	import type { FriendRank } from '../../dashboard/sample';
	import Avatar from '../ui/Avatar.svelte';
	import Card from '../ui/Card.svelte';
	import Icon from '../ui/Icon.svelte';

	type Props = { ranking: FriendRank[] };
	let { ranking }: Props = $props();
</script>

<Card>
	<h3 class="flex items-center gap-2">
		<Icon name="trophy" size={20} class="text-wheat" /> Vrienden deze week
	</h3>
	<ol class="mt-3 flex flex-col gap-2">
		{#each ranking as friend, i (friend.name)}
			<li class="flex items-center gap-3">
				<span class="grid size-6 place-items-center rounded-full bg-surface-2 font-heading text-sm font-semibold">{i + 1}</span>
				<Avatar name={friend.name} size={30} />
				<span class="min-w-0 flex-1 truncate font-semibold">{friend.name}</span>
				<span class="text-sm text-text-muted">{friend.practiced} onderdelen</span>
			</li>
		{/each}
	</ol>
	<a href="/leaderboard" class="mt-3 inline-block text-sm font-bold text-primary-text hover:underline">Hele ranglijst</a>
</Card>