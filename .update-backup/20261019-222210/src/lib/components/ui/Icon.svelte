<script lang="ts" module>
	export type IconName =
		| 'home'
		| 'book'
		| 'layers'
		| 'users'
		| 'chart'
		| 'sliders'
		| 'search'
		| 'play'
		| 'plus'
		| 'import'
		| 'share'
		| 'user-plus'
		| 'trophy'
		| 'flame'
		| 'chevron-left'
		| 'repeat'
		| 'ear'
		| 'spelling'
		| 'bulb'
		| 'list'
		| 'cards'
		| 'more'
		| 'copy'
		| 'chevron-right'
		| 'chevron-down'
		| 'arrow-left'
		| 'sun'
		| 'moon'
		| 'check'
		| 'x'
		| 'languages'
		| 'column'
		| 'speaker'
		| 'trash' 
		| 'pencil' 
		| 'grip' 
		| 'download' 
		| 'code' 
		| 'tag';

	// 24x24 stroke icons (2px round line). `fill` icons are solid.
	const ICONS: Record<IconName, { d: string; fill?: boolean }> = {
		home: { d: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10' },
		book: { d: 'M5 4h13a1 1 0 0 1 1 1v14H6a2 2 0 0 0-2 2V6a2 2 0 0 1 1-2zM6 19h13' },
		layers: { d: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5' },
		users: {
			d: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5M16 4.5a3.2 3.2 0 0 1 0 6M18 14.8c2 .6 3.5 2.3 3.5 5.2'
		},
		chart: { d: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
		sliders: { d: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 4v6M9 14v6' },
		search: { d: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5' },
		play: { d: 'M7 4.5v15l12-7.5z', fill: true },
		plus: { d: 'M12 5v14M5 12h14' },
		import: { d: 'M12 3v12M7 10l5 5 5-5M4 20h16' },
		share: { d: 'M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6' },
		'user-plus': { d: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-3.5 3-6 7-6s7 2.5 7 6M19 8v6M16 11h6' },
		trophy: { d: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 13v4M8 21h8M10 17h4' },
		flame: { d: 'M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1.5 1 2 2 2 0-3-1-5 1-8z' },
		repeat: { d: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3' },
		ear: { d: 'M6 9a6 6 0 0 1 12 0c0 3-2 4-3 6s0 5-3 5-3-2-3-3M9.5 9a2.5 2.5 0 0 1 5 0' },
		spelling: { d: 'M3 18l5-12 5 12M5 14h6M15 15l3 3 5-6' },
		bulb: { d: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z' },
		list: { d: 'M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01' },
		cards: { d: 'M8 4h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM4 8v12a1 1 0 0 0 1 1h11' },
		more: { d: 'M12 5h.01M12 12h.01M12 19h.01' },
		copy: { d: 'M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1zM5 15V5a1 1 0 0 1 1-1h10' },
		'chevron-left': { d: 'M15 6l-6 6 6 6' },
		'chevron-right': { d: 'M9 6l6 6-6 6' },
		'chevron-down': { d: 'M6 9l6 6 6-6' },
		'arrow-left': { d: 'M19 12H5M11 6l-6 6 6 6' },
		sun: {
			d: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'
		},
		moon: { d: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z' },
		check: { d: 'M5 12.5l4.5 4.5L19 7' },
		x: { d: 'M6 6l12 12M18 6L6 18' },
		languages: { d: 'M4 6h9M8.5 4v2M6 6c.5 3 3 6 6 7M12 6c-.5 3-3.5 7-7.5 8.5M14 20l4-9 4 9M15.5 17h5' },
		column: { d: 'M5 4h14M6 7h12M9 7v11M15 7v11M5 20h14M7 18h10' },
		trash: { d: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3' },
		pencil: { d: 'M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19zM14 7l3 3' },
		grip: { d: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01' },
		download: { d: 'M12 15V3M7 10l5 5 5-5M4 20h16' },
		code: { d: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16' },
		tag: { d: 'M3 12V4h8l10 10-8 8zM7.5 8.5h.01' },
		speaker: { d: 'M4 9v6h4l5 4V5L8 9zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12' }
	};

	export { ICONS };
</script>

<script lang="ts">
	type Props = { name: IconName; size?: number; class?: string; label?: string };
	let { name, size = 22, class: className = '', label }: Props = $props();
	const icon = $derived(ICONS[name]);
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill={icon.fill ? 'currentColor' : 'none'}
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	class={['shrink-0', className]}
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
>
	<path d={icon.d} />
</svg>