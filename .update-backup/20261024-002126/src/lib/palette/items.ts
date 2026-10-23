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
	'/friends': ['vriend', 'vrienden', 'sociaal'],
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

	// Sub-pages that are not in the sidebar.
	items.push(
		{ id: 'pagina:/leaderboard', group: 'pages', title: 'Ranglijst', keywords: ['leaderboard', 'top', 'vrienden'], icon: 'trophy', href: '/leaderboard' },
		{ id: 'pagina:/uitdagingen', group: 'pages', title: 'Uitdagingen', keywords: ['uitdagen', 'wedstrijd', 'vrienden'], icon: 'flame', href: '/uitdagingen' },
		{ id: 'pagina:/bibliotheek', group: 'pages', title: 'Bibliotheek', keywords: ['kant-en-klaar', 'stijlfiguren', 'grammatica', 'stamtijden'], icon: 'cards', href: '/bibliotheek' }
	);

	items.push(
		{ id: 'actie:nieuwe-set', group: 'actions', title: 'Nieuwe set', keywords: ['maak', 'aanmaken', 'toevoegen'], icon: 'plus', accent: 'primary', href: '/sets/new' },
		{ id: 'actie:importeren', group: 'actions', title: 'Importeren uit Quizlet of StudyGo', keywords: ['import', 'plakken', 'kopiëren', 'woordenlijst', 'kaartjes'], icon: 'import', href: '/sets?import=cards' },
		{ id: 'actie:importeren-json', group: 'actions', title: 'Importeren uit JSON', keywords: ['import', 'plakken', 'uploaden', 'bestand'], icon: 'code', href: '/sets?import=json' },
		{ id: 'actie:ai', group: 'actions', title: 'Set maken met AI', subtitle: 'Beschrijf je set, of gebruik een foto', keywords: ['automatisch', 'genereren', 'prompt', 'foto', 'document'], icon: 'sparkles', href: '/sets/ai' },
		{ id: 'actie:nieuw-vak', group: 'actions', title: 'Nieuw vak', subtitle: 'Een vak ontstaat bij een nieuwe set', keywords: ['maak', 'aanmaken', 'toevoegen'], icon: 'plus', href: '/sets/new' },
		{ id: 'actie:vriend', group: 'actions', title: 'Vriend toevoegen', keywords: ['gebruikersnaam', 'uitnodigen'], icon: 'user-plus', href: '/friends' },
		{ id: 'actie:thema', group: 'actions', title: 'Thema wisselen', subtitle: 'Licht of donker', keywords: ['dark mode', 'donker', 'licht', 'nacht'], icon: 'moon', run: () => theme.toggle() }
	);

	return items;
}