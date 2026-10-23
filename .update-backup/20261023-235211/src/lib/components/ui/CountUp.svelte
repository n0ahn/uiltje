<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	// A number that counts up to its value when it appears and glides when it changes.
	// Instant when the person prefers reduced motion.
	type Props = { value: number; decimals?: number; duration?: number };
	let { value, decimals = 0, duration = 900 }: Props = $props();

	const tween = new Tween(0, { easing: cubicOut });
	let first = true;
	$effect(() => {
		const target = value;
		const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		void tween.set(target, { duration: calm ? 0 : first ? duration : duration * 0.6 });
		first = false;
	});
</script>

<span class="tabular-nums">{tween.current.toFixed(decimals).replace('.', ',')}</span>
