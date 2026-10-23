<script lang="ts">
	import Owl from '../ui/Owl.svelte';
</script>

<!-- Illustrated card at the bottom of the sidebar: soft sunset scene, owl on a branch. -->
<div class="relative h-42.5 overflow-hidden rounded-card border border-border bg-surface-2">
	<svg viewBox="0 0 200 170" class="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
		<rect width="200" height="170" class="fill-primary-soft" />
		<circle cx="150" cy="62" r="26" class="fill-wheat" opacity="0.55" />
		<path d="M0 118C40 98 80 108 120 96C150 88 175 92 200 100V170H0Z" class="fill-sage-soft" />
		<path d="M0 138C50 124 90 136 140 126C165 121 185 124 200 128V170H0Z" class="fill-sage" opacity="0.55" />
		<path d="M10 132C50 126 90 128 130 122" fill="none" class="stroke-clay" stroke-width="7" stroke-linecap="round" />
		<path d="M118 112l14-10M96 124l-10-12" fill="none" class="stroke-clay" stroke-width="3.5" stroke-linecap="round" />
	</svg>
	<Owl pose="idle" size={64} class="absolute bottom-8.5 left-14.5" />
	<p class="absolute inset-x-3 top-3 text-center font-heading text-[0.8rem] leading-snug font-medium text-text italic">
		Kleine stapjes, grote vooruitgang.
	</p>
</div>