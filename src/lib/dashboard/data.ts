// Dashboard data built from the user's own sets, progress and session log (phase 6).
// Friends stay placeholder data until the friends feature exists (see sample.ts).
import type { Accent } from '../components/ui/accent';
import type { IconName } from '../components/ui/Icon.svelte';
import type { LoadedStats } from '../stats/library';
import { ratio, recentSetIds, setMastery, streakDays, subjectStats, weekActivity } from '../stats/stats';
import { subjectAccent, subjectIcon, subjectSlug } from '../utils/subject';

export type RecentPractice = {
	title: string;
	/** Continue practising (same way as last time). */
	href: string;
	/** The set page. */
	setHref: string;
	/** 0..1 share of onderdelen onder de knie. */
	mastered: number;
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

export type DashboardData = {
	recent: RecentPractice | null;
	subjects: SubjectSummary[];
	recentSets: RecentSet[];
	/** Every set, most recently practised first (for search). */
	allSets: RecentSet[];
	streak: number;
	week: { day: string; amount: number }[];
};

export function buildDashboard({ library, sessions }: LoadedStats, now: number): DashboardData {
	const byId = new Map(library.map((item) => [item.set.id, item]));

	const last = [...sessions].sort((a, b) => b.endedAt - a.endedAt).find((s) => s.setIds.some((id) => byId.has(id)));
	const lastItem = last ? byId.get(last.setIds.find((id) => byId.has(id)) ?? '') : undefined;
	const recent: RecentPractice | null =
		last && lastItem
			? {
					title: lastItem.set.title,
					href: `/sets/${lastItem.set.id}/practice?mode=${last.mode}`,
					setHref: `/sets/${lastItem.set.id}`,
					mastered: ratio(setMastery(lastItem))
				}
			: null;

	const subjects = subjectStats(library).map((s) => ({
		slug: subjectSlug(s.name),
		name: s.name,
		icon: subjectIcon(s.name),
		accent: subjectAccent(s.name),
		sets: s.sets,
		mastered: s.mastered,
		total: s.total
	}));

	const allSets = recentSetIds(sessions, library.map((i) => i.set.id))
		.flatMap((id) => {
			const item = byId.get(id);
			if (!item) return [];
			return [
				{
					title: item.set.title,
					href: `/sets/${item.set.id}`,
					subject: item.set.subject.trim(),
					accent: subjectAccent(item.set.subject),
					icon: subjectIcon(item.set.subject),
					percentMastered: Math.round(ratio(setMastery(item)) * 100)
				}
			];
		});

	return { recent, subjects, recentSets: allSets.slice(0, 4), allSets, streak: streakDays(sessions, now), week: weekActivity(sessions, now) };
}
