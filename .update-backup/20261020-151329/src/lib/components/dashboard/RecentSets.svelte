<script lang="ts">
	import type { RecentSet } from '../../dashboard/sample';
	import { accentStyle } from '../ui/accent';
	import Card from '../ui/Card.svelte';
	import Chip from '../ui/Chip.svelte';
	import Icon from '../ui/Icon.svelte';

	type Props = { sets: RecentSet[] };
	let { sets }: Props = $props();
</script>

<Card padded={false} class="overflow-hidden">
	<ul class="divide-y divide-border">
		{#each sets as set (set.href)}
			<li>
				<a
					href={set.href}
					style={accentStyle(set.accent)}
					class="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-surface-2 sm:gap-4 sm:px-5"
				>
					<span
						class="grid size-10 shrink-0 place-items-center rounded-tile bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-(--accent)"
					>
						<Icon name={set.icon} size={20} />
					</span>
					<span class="min-w-0 flex-1 truncate font-semibold">{set.title}</span>
					<span class="hidden sm:block"><Chip>{set.subject}</Chip></span>
					<span class="text-sm font-semibold whitespace-nowrap text-text-muted">
						{set.percentMastered}%<span class="hidden sm:inline">&nbsp;onder de knie</span>
					</span>
					<Icon name="chevron-right" size={18} class="text-text-muted" />
				</a>
			</li>
		{/each}
	</ul>
</Card>