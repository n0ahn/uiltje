// Static placeholder data for the dashboard (phase 2). Replaced by storage-backed data in phases 3-6.
import type { Accent } from '../components/ui/accent';
import type { IconName } from '../components/ui/Icon.svelte';

export type RecentPractice = {
	title: string;
	href: string;
	stage: number;
	stageCount: number;
};

export type SubjectSummary = {
	slug: string;
	name: string;
	icon: IconName;
	accent: Accent;
	sets: number;
	mastered: number;
	total: number;
};

export type RecentSet = {
	title: string;
	href: string;
	subject: string;
	accent: Accent;
	icon: IconName;
	percentMastered: number;
};

export type FriendRank = { name: string; practiced: number };

export const recentPractice: RecentPractice | null = {
	title: 'Latijn: 1e declinatie',
	href: '/sets/latin-declinaties/practice',
	stage: 3,
	stageCount: 5
};

export const subjects: SubjectSummary[] = [
	{ slug: 'latin', name: 'Latijn', icon: 'languages', accent: 'primary', sets: 5, mastered: 12, total: 20 },
	{ slug: 'greek', name: 'Grieks', icon: 'column', accent: 'sky', sets: 2, mastered: 6, total: 16 }
];

export const recentSets: RecentSet[] = [
	{ title: 'Latijn: declinaties', href: '/sets/latin-declinaties', subject: 'Latijn', accent: 'primary', icon: 'languages', percentMastered: 60 },
	{ title: 'Latijn: perfectum', href: '/sets/latin-perfectum', subject: 'Latijn', accent: 'primary', icon: 'languages', percentMastered: 35 },
	{ title: 'Grieks: lidwoorden', href: '/sets/greek-lidwoorden', subject: 'Grieks', accent: 'sky', icon: 'column', percentMastered: 80 }
];

/** Practice per weekday, Monday first. 0 = not practised. Heights are relative (0..1). */
export const weekActivity: { day: string; amount: number }[] = [
	{ day: 'Ma', amount: 0.5 },
	{ day: 'Di', amount: 0.8 },
	{ day: 'Wo', amount: 0.4 },
	{ day: 'Do', amount: 0.9 },
	{ day: 'Vr', amount: 1 },
	{ day: 'Za', amount: 0 },
	{ day: 'Zo', amount: 0 }
];

export const streakDays = 5;

export const friendRanking: FriendRank[] = [
	{ name: 'Sanne', practiced: 24 },
	{ name: 'Daan', practiced: 19 },
	{ name: 'Lotte', practiced: 15 }
];