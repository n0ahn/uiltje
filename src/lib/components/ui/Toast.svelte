<script lang="ts">
	import { toasts } from '../../state/toast.svelte';
	import Owl from './Owl.svelte';
</script>

<!-- Bottom center on desktop, above the tab bar on mobile. -->
<div
	role="status"
	aria-live="polite"
	class="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4 max-sm:bottom-[calc(64px+env(safe-area-inset-bottom)+12px)]"
>
	{#each toasts.items as toast (toast.id)}
		<div class="toast pointer-events-auto">
			<Owl size={24} pose="happy" />
			<span>{toast.text}</span>
		</div>
	{/each}
</div>