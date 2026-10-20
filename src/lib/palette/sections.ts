import { rank, type Ranked } from './search';
import type { PaletteGroup, PaletteItem } from './types';

export type Section = { group: PaletteGroup; label: string; entries: Ranked<PaletteItem>[] };

const LABELS: Record<PaletteGroup, string> = {
	continue: 'Verder waar je was',
	sets: 'Sets',
	vakken: 'Vakken',
	vrienden: 'Vrienden',
	pages: 'Ga naar',
	actions: 'Acties'
};

/** Group order when two groups match equally well. */
const GROUP_ORDER: PaletteGroup[] = ['continue', 'pages', 'vakken', 'sets', 'vrienden', 'actions'];

/** What is shown before typing: the first row is "carry on where you left off". */
const EMPTY_LAYOUT: { group: PaletteGroup; label: string; limit: number }[] = [
	{ group: 'continue', label: LABELS.continue, limit: 1 },
	{ group: 'sets', label: 'Recente sets', limit: 3 },
	{ group: 'actions', label: LABELS.actions, limit: 5 },
	{ group: 'pages', label: LABELS.pages, limit: 8 }
];

const RESULTS_PER_GROUP = 5;

/** Sections for the palette. With an empty query: suggestions; otherwise ranked matches per group. */
export function buildSections(items: readonly PaletteItem[], query: string): Section[] {
	if (query.trim() === '') {
		return EMPTY_LAYOUT.map(({ group, label, limit }) => ({
			group,
			label,
			entries: items
				.filter((item) => item.group === group)
				.slice(0, limit)
				.map((item) => ({ item, score: 0, ranges: [] }))
		})).filter((section) => section.entries.length > 0);
	}

	const byGroup = new Map<PaletteGroup, Ranked<PaletteItem>[]>();
	for (const result of rank(items, query)) {
		const list = byGroup.get(result.item.group) ?? [];
		list.push(result);
		byGroup.set(result.item.group, list);
	}

	return [...byGroup.entries()]
		.map(([group, entries]) => ({ group, label: LABELS[group], entries: entries.slice(0, RESULTS_PER_GROUP) }))
		.sort(
			(a, b) =>
				(b.entries[0]?.score ?? 0) - (a.entries[0]?.score ?? 0) || GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group)
		);
}