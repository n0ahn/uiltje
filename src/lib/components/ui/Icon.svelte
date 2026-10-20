<script lang="ts" module>
	export type IconName =
		'home'
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
		| 'paste'
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
		| 'tag'
		| 'user'
		| 'log-in'
		| 'log-out'
		| 'eye'
		| 'eye-off';
</script>

<script lang="ts">
	import HouseIcon from '@lucide/svelte/icons/house';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import UsersIcon from '@lucide/svelte/icons/users';
	import ChartColumnIcon from '@lucide/svelte/icons/chart-column';
	import SlidersHorizontalIcon from '@lucide/svelte/icons/sliders-horizontal';
	import SearchIcon from '@lucide/svelte/icons/search';
	import PlayIcon from '@lucide/svelte/icons/play';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import ImportIcon from '@lucide/svelte/icons/import';
	import Share2Icon from '@lucide/svelte/icons/share-2';
	import UserPlusIcon from '@lucide/svelte/icons/user-plus';
	import TrophyIcon from '@lucide/svelte/icons/trophy';
	import FlameIcon from '@lucide/svelte/icons/flame';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import RepeatIcon from '@lucide/svelte/icons/repeat';
	import EarIcon from '@lucide/svelte/icons/ear';
	import SpellCheckIcon from '@lucide/svelte/icons/spell-check';
	import LightbulbIcon from '@lucide/svelte/icons/lightbulb';
	import ListIcon from '@lucide/svelte/icons/list';
	import GalleryHorizontalEndIcon from '@lucide/svelte/icons/gallery-horizontal-end';
	import EllipsisVerticalIcon from '@lucide/svelte/icons/ellipsis-vertical';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import ClipboardPasteIcon from '@lucide/svelte/icons/clipboard-paste';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import CheckIcon from '@lucide/svelte/icons/check';
	import XIcon from '@lucide/svelte/icons/x';
	import LanguagesIcon from '@lucide/svelte/icons/languages';
	import Columns3Icon from '@lucide/svelte/icons/columns-3';
	import Volume2Icon from '@lucide/svelte/icons/volume-2';
	import TrashIcon from '@lucide/svelte/icons/trash';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import GripVerticalIcon from '@lucide/svelte/icons/grip-vertical';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import CodeIcon from '@lucide/svelte/icons/code';
	import TagIcon from '@lucide/svelte/icons/tag';
	import UserIcon from '@lucide/svelte/icons/user';
	import LogInIcon from '@lucide/svelte/icons/log-in';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';

	// Icons come from Lucide (https://lucide.dev). Keep our own names so components do not depend on the library.
	const ICONS = {
		home: HouseIcon,
		book: BookOpenIcon,
		layers: LayersIcon,
		users: UsersIcon,
		chart: ChartColumnIcon,
		sliders: SlidersHorizontalIcon,
		search: SearchIcon,
		play: PlayIcon,
		plus: PlusIcon,
		import: ImportIcon,
		share: Share2Icon,
		'user-plus': UserPlusIcon,
		trophy: TrophyIcon,
		flame: FlameIcon,
		'chevron-left': ChevronLeftIcon,
		repeat: RepeatIcon,
		ear: EarIcon,
		spelling: SpellCheckIcon,
		bulb: LightbulbIcon,
		list: ListIcon,
		cards: GalleryHorizontalEndIcon,
		more: EllipsisVerticalIcon,
		copy: CopyIcon,
		paste: ClipboardPasteIcon,
		'chevron-right': ChevronRightIcon,
		'chevron-down': ChevronDownIcon,
		'arrow-left': ArrowLeftIcon,
		sun: SunIcon,
		moon: MoonIcon,
		check: CheckIcon,
		x: XIcon,
		languages: LanguagesIcon,
		column: Columns3Icon,
		speaker: Volume2Icon,
		trash: TrashIcon,
		pencil: PencilIcon,
		grip: GripVerticalIcon,
		download: DownloadIcon,
		code: CodeIcon,
		tag: TagIcon,
		user: UserIcon,
		'log-in': LogInIcon,
		'log-out': LogOutIcon,
		eye: EyeIcon,
		'eye-off': EyeOffIcon
	};
	// Solid icons look friendlier for "play" and "flame".
	const FILLED = new Set<IconName>(['play', 'flame']);

	type Props = { name: IconName; size?: number; class?: string; label?: string };
	let { name, size = 22, class: className = '', label }: Props = $props();
	const Component = $derived(ICONS[name]);
</script>

<Component
	{size}
	strokeWidth={2.25}
	fill={FILLED.has(name) ? 'currentColor' : 'none'}
	class={['shrink-0', className]}
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
/>
