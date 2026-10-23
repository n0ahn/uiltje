<script lang="ts">
	import Owl from '../ui/Owl.svelte';
</script>

<!-- Illustrated card at the bottom of the sidebar: a soft evening hill, a branch that grows out of a trunk, and Uiltje
     sitting on it. The picture keeps its 200:170 shape (so the owl always lands on the branch) and scales with the card. -->
<div class="relative aspect-200/170 w-full overflow-hidden rounded-card border border-border bg-primary-soft">
	<svg viewBox="0 0 200 170" class="absolute inset-0 h-full w-full" aria-hidden="true">
		<!-- sky: sun with a soft ring, two clouds -->
		<circle cx="158" cy="74" r="30" class="fill-wheat" opacity="0.25" />
		<circle cx="158" cy="74" r="19" class="fill-wheat" opacity="0.75" />
		<g class="fill-cream" opacity="0.9">
			<path d="M20 58c0-6 5-9 10-8 2-5 11-5 13 1 5-1 8 4 5 8H24c-3 0-4-1-4-1z" />
			<path d="M120 44c0-4 4-6 7-5 2-4 9-3 10 1 4 0 5 3 3 6h-18c-2 0-2-1-2-2z" />
		</g>

		<!-- hills -->
		<path d="M0 112C34 94 72 104 108 94C146 84 176 92 200 100V170H0Z" class="fill-sage-soft" />
		<path d="M0 142C44 126 88 140 136 130C164 124 184 126 200 130V170H0Z" class="fill-sage" opacity="0.6" />

		<!-- trunk on the left edge and a branch reaching to the right, with leaves that grow from it -->
		<g stroke-width="3" class="stroke-ink" stroke-linejoin="round" stroke-linecap="round">
			<path d="M-4 170V86C-4 80 4 78 12 80L22 104C48 114 76 114 104 112C132 110 150 112 166 108L176 114C150 124 124 124 100 124C70 124 40 124 22 120V170Z" class="fill-clay" />
			<path d="M110 114C122 104 130 96 144 92" fill="none" />
			<path d="M150 110C158 104 168 102 176 104" fill="none" />
		</g>
		<g stroke-width="2.5" class="fill-sage stroke-ink" stroke-linejoin="round">
			<path d="M144 92c-10 0-14-8-12-14 8 0 14 5 12 14z" />
			<path d="M144 92c8-5 17-3 20 3-6 5-15 4-20-3z" />
			<path d="M176 104c-8-1-12-8-10-14 8 1 12 6 10 14z" />
			<path d="M160 105c-6-5-6-13-2-17 7 3 9 11 2 17z" />
			<path d="M28 82c-9-2-12-10-9-16 8 1 12 8 9 16z" />
			<path d="M28 84c8-5 17-2 19 5-7 4-15 3-19-5z" />
		</g>
	</svg>

	<!-- Uiltje: its feet land on the top of the branch (about y 110 of 170), centred on x 76 of 200 -->
	<Owl pose="idle" size={64} class="absolute top-[29%] left-[23.7%]" />

	<p class="absolute inset-x-3 top-3 text-center font-heading text-[0.8rem] leading-snug font-medium text-text italic">
		Kleine stapjes, grote vooruitgang.
	</p>
</div>
