<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = { active?: boolean; class?: string; children: Snippet };
	let { active = false, class: className = '', children }: Props = $props();
</script>

<span
	class={[
		'inline-flex h-7 items-center gap-1 rounded-full border-[1.5px] px-3 text-sm font-semibold whitespace-nowrap',
		active ? 'border-primary bg-primary-soft text-primary-text' : 'border-transparent bg-surface-2 text-text-muted',
		className
	]}
>
	{@render children()}
</span>