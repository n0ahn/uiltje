<script lang="ts">
	import Owl from '../ui/Owl.svelte';
	import type { OwlPose } from '../ui/Owl.svelte';

	// Uiltje sitting on a stack of books (DESIGN.md §6.8). The books overlap the owl's feet and the top of the card below.
	type Props = { pose?: OwlPose; class?: string };
	let { pose = 'idle', class: className = '' }: Props = $props();
</script>

<div class={['flex flex-col items-center', className]} aria-hidden="true">
	<Owl {pose} size={140} class="relative z-10 h-auto w-28 sm:w-35" />
	<svg viewBox="0 0 160 58" class="relative z-10 -mt-2 w-36 sm:w-40" fill="none" stroke-linejoin="round" stroke-linecap="round">
		<g class="stroke-ink" stroke-width="3">
			<rect x="6" y="35" width="148" height="21" rx="6" class="fill-primary" />
			<rect x="20" y="40" width="130" height="11" rx="3" class="fill-belly" />
			<rect x="20" y="18" width="122" height="19" rx="6" class="fill-sage" />
			<rect x="32" y="23" width="106" height="9" rx="3" class="fill-belly" />
			<rect x="38" y="3" width="90" height="17" rx="6" class="fill-sky" />
			<rect x="50" y="8" width="74" height="7" rx="3" class="fill-belly" />
		</g>
		<path d="M12 42v8M26 24v8M44 9v6" class="stroke-ink" stroke-width="2.5" opacity="0.55" />
	</svg>
</div>
