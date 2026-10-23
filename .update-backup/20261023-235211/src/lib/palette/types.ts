import type { Accent } from '../components/ui/accent';
import type { IconName } from '../components/ui/Icon.svelte';

export type PaletteGroup = 'continue' | 'sets' | 'vakken' | 'vrienden' | 'pages' | 'actions';

export type PaletteItem = {
	/** Unique and stable (used as list key). */
	id: string;
	group: PaletteGroup;
	title: string;
	/** Second line under the title. Display only, not searched. */
	subtitle?: string;
	/** Hidden search terms (synonyms, the subject of a set), e.g. "ranglijst" for Vrienden. Weaker than the title. */
	keywords?: string[];
	icon: IconName;
	accent?: Accent;
	/** Show an avatar for this name instead of the icon (friends). */
	avatar?: string;
	/** Navigate here when chosen... */
	href?: string;
	/** ...or run this instead. */
	run?: () => void;
};