<script lang="ts">
	/** Placeholder block for content that is still loading. Size it with utility classes (`h-4 w-1/2`). Decorative: hidden from screen readers. */
	type Props = { class?: string };
	let { class: className = '' }: Props = $props();
</script>

<div class={['skeleton', className]} aria-hidden="true"></div>
