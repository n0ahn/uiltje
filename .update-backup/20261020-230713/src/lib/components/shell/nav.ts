import type { IconName } from '../ui/Icon.svelte';

export type NavItem = {
	href: string;
	label: string;
	icon: IconName;
	/** Extra path prefixes that also mark this item active (e.g. /vak/latin under Vakken). */
	prefixes: string[];
	/** Shown in the mobile bottom bar (max 5). */
	mobile: boolean;
};

export const NAV: NavItem[] = [
	{ href: '/', label: 'Home', icon: 'home', prefixes: [], mobile: true },
	{ href: '/vakken', label: 'Vakken', icon: 'book', prefixes: ['/vak/'], mobile: true },
	{ href: '/sets', label: 'Mijn sets', icon: 'layers', prefixes: ['/sets/'], mobile: false },
	{ href: '/friends', label: 'Vrienden', icon: 'users', prefixes: [], mobile: true },
	{ href: '/leaderboard', label: 'Ranglijst', icon: 'trophy', prefixes: [], mobile: false },
	{ href: '/stats', label: 'Statistieken', icon: 'chart', prefixes: [], mobile: true },
	{ href: '/settings', label: 'Instellingen', icon: 'sliders', prefixes: [], mobile: true }
];

export function isActive(item: NavItem, pathname: string): boolean {
	if (item.href === '/') return pathname === '/';
	return [item.href, ...item.prefixes].some((p) => pathname === p || pathname.startsWith(p.endsWith('/') ? p : `${p}/`));
}