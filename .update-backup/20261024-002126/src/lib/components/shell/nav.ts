import type { IconName } from '../ui/Icon.svelte';

export type NavItem = {
	href: string;
	label: string;
	icon: IconName;
	/** Extra path prefixes that also mark this item active (e.g. /vak/latin under Vakken). */
	prefixes: string[];
	/** Shown in the mobile bottom bar (max 5). */
	mobile: boolean;
	/** Heading in the sidebar: items with the same group sit together. */
	group: string;
};

export const NAV: NavItem[] = [
	{ href: '/', label: 'Home', icon: 'home', prefixes: [], mobile: true, group: 'Leren' },
	{ href: '/vakken', label: 'Vakken', icon: 'book', prefixes: ['/vak/'], mobile: true, group: 'Leren' },
	{ href: '/sets', label: 'Mijn sets', icon: 'layers', prefixes: ['/sets/', '/bibliotheek'], mobile: false, group: 'Leren' },
	// Ranglijst and Uitdagingen are tabs on the Vrienden pages (components/social/SocialTabs.svelte).
	{ href: '/friends', label: 'Vrienden', icon: 'users', prefixes: ['/leaderboard', '/uitdagingen', '/uitdaging/', '/u/', '/i/'], mobile: true, group: 'Samen' },
	{ href: '/stats', label: 'Statistieken', icon: 'chart', prefixes: [], mobile: true, group: 'Jij' },
	{ href: '/settings', label: 'Instellingen', icon: 'sliders', prefixes: [], mobile: true, group: 'Jij' }
];

export function isActive(item: NavItem, pathname: string): boolean {
	if (item.href === '/') return pathname === '/';
	return [item.href, ...item.prefixes].some((p) => pathname === p || pathname.startsWith(p.endsWith('/') ? p : `${p}/`));
}