// Everything the command palette can find: the user's own sets and subjects (from the overview), pages and actions.
// Friends are added when the friends feature exists.
import { NAV } from '../components/shell/nav';
import type { DashboardData } from '../dashboard/data';
import { theme } from '../state/theme.svelte';
import type { PaletteItem } from './types';

/** Extra search terms per page (the label itself is always searchable). */
const PAGE_KEYWORDS: Record<string, string[]> = {
	'/': ['dashboard', 'start', 'overzicht'],
	'/vakken': ['talen', 'latijn', 'grieks'],
	'/sets': ['mijn sets', 'rijtjes', 'lijsten', 'woorden'],
	'/friends': ['ranglijst', 'leaderboard', 'vriend'],
	'/stats': ['voortgang', 'streak', 'grafiek'],
	'/settings': ['thema', 'geluid', 'profiel', 'account', 'nakijken']
};

export function buildPaletteItems(overview: DashboardData | null): PaletteItem[] {
	const items: PaletteItem[] = [];
	const recentPractice = overview?.recent ?? null;
	const recentSets = overview?.allSets ?? [];
	const subjects = overview?.subjects ?? [];

	if (recentPractice) {
		items.push({
			id: 'continue',
			group: 'continue',
			title: 'Verder oefenen',
			subtitle: `${recentPractice.title} · ${Math.round(recentPractice.mastered * 100)}% onder de knie`,
			keywords: ['hervat', 'doorgaan', 'oefenen', recentPractice.title],
			icon: 'play',
			accent: 'primary',
			href: recentPractice.href
		});
	}

	for (const set of recentSets) {
		items.push({
			id: `set:${set.href}`,
			group: 'sets',
			title: set.title,
			subtitle: `${set.subject} · ${set.percentMastered}% onder de knie`,
			keywords: [set.subject],
			icon: set.icon,
			accent: set.accent,
			href: set.href
		});
	}

	for (const subject of subjects) {
		items.push({
			id: `vak:${subject.slug}`,
			group: 'vakken',
			title: subject.name,
			subtitle: `${subject.sets} sets`,
			icon: subject.icon,
			accent: subject.accent,
			href: `/vak/${subject.slug}`
		});
	}

	for (const page of NAV) {
		items.push({
			id: `pagina:${page.href}`,
			group: 'pages',
			title: page.label,
			keywords: PAGE_KEYWORDS[page.href],
			icon: page.icon,
			href: page.href
		});
	}

	items.push(
		{ id: 'actie:nieuwe-set', group: 'actions', title: 'Nieuwe set', keywords: ['maak', 'aanmaken', 'toevoegen'], icon: 'plus', accent: 'primary', href: '/sets/new' },
		{ id: 'actie:importeren', group: 'actions', title: 'Set importeren', keywords: ['json', 'plakken', 'uploaden'], icon: 'import', href: '/sets/new?import=1' },
		{ id: 'actie:nieuw-vak', group: 'actions', title: 'Nieuw vak', subtitle: 'Een vak ontstaat bij een nieuwe set', keywords: ['maak', 'aanmaken', 'toevoegen'], icon: 'plus', href: '/sets/new' },
		{ id: 'actie:vriend', group: 'actions', title: 'Vriend toevoegen', keywords: ['gebruikersnaam', 'uitnodigen'], icon: 'user-plus', href: '/friends' },
		{ id: 'actie:thema', group: 'actions', title: 'Thema wisselen', subtitle: 'Licht of donker', keywords: ['dark mode', 'donker', 'licht', 'nacht'], icon: 'moon', run: () => theme.toggle() }
	);

	return items;
}