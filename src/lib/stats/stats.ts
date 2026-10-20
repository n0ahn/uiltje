// Statistics (PLAN §6, DESIGN §7). Pure TS: everything is counted in onderdelen (rows); a onderdeel is
// "onder de knie" when its streak of unaided correct answers is at least 2. Days are the user's local days.
import type { RowStats } from '../engine/types';
import type { StudySet } from '../schema/types';
import type { ProgressMap, SessionLog } from '../storage/adapter';
import { sameSubject } from '../utils/subject';

export const MASTERED_STREAK = 2;

/** A set together with the saved progress of its rows. */
export type LibrarySet = { set: StudySet; progress: ProgressMap };

export const isMastered = (stats: RowStats | undefined): boolean => !!stats && stats.streak >= MASTERED_STREAK;

export type Mastery = { total: number; mastered: number };

export function setMastery({ set, progress }: LibrarySet): Mastery {
	let total = 0;
	let mastered = 0;
	for (const list of set.lists) {
		for (const row of list.rows) {
			total++;
			if (isMastered(progress[`${set.id}/${list.id}/${row.id}`])) mastered++;
		}
	}
	return { total, mastered };
}

export const ratio = (m: Mastery): number => (m.total === 0 ? 0 : m.mastered / m.total);

export type SubjectStats = Mastery & { name: string; sets: number };

/** Subjects are free text; "Latijn" and " latijn " are the same subject. */
export function subjectStats(library: readonly LibrarySet[]): SubjectStats[] {
	const out: SubjectStats[] = [];
	for (const item of library) {
		const m = setMastery(item);
		const found = out.find((s) => sameSubject(s.name, item.set.subject));
		if (found) {
			found.sets++;
			found.total += m.total;
			found.mastered += m.mastered;
		} else out.push({ name: item.set.subject.trim(), sets: 1, ...m });
	}
	return out.sort((a, b) => a.name.localeCompare(b.name, 'nl'));
}

/** Share of unaided correct answers over all answers that were right or wrong (after-hint answers are neutral). */
export function accuracy(library: readonly LibrarySet[]): number | null {
	let correct = 0;
	let wrong = 0;
	for (const { set, progress } of library) {
		const prefix = `${set.id}/`;
		for (const [key, stats] of Object.entries(progress)) {
			if (!key.startsWith(prefix)) continue;
			correct += stats.correct;
			wrong += stats.wrong;
		}
	}
	return correct + wrong === 0 ? null : correct / (correct + wrong);
}

export type HardRow = {
	key: string;
	setId: string;
	setTitle: string;
	listTitle: string;
	prompt: string;
	answer: string;
	wrong: number;
	correct: number;
};

/** Onderdelen with the most mistakes first. Rows that are onder de knie now are left out (they are no longer hard). */
export function hardestRows(library: readonly LibrarySet[], limit: number): HardRow[] {
	const out: HardRow[] = [];
	for (const { set, progress } of library) {
		for (const list of set.lists) {
			for (const row of list.rows) {
				const key = `${set.id}/${list.id}/${row.id}`;
				const stats = progress[key];
				if (!stats || stats.wrong === 0 || isMastered(stats)) continue;
				out.push({
					key,
					setId: set.id,
					setTitle: set.title,
					listTitle: list.title,
					prompt: row.prompt,
					answer: row.answers[0] ?? '',
					wrong: stats.wrong,
					correct: stats.correct
				});
			}
		}
	}
	const rate = (r: HardRow) => r.wrong / (r.wrong + r.correct);
	return out.sort((a, b) => b.wrong - a.wrong || rate(b) - rate(a)).slice(0, limit);
}

// ---- days, streak and activity

/** Local calendar day of a moment, as `YYYY-MM-DD`. */
export function dayKey(ms: number): string {
	const d = new Date(ms);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfDay(ms: number): Date {
	const d = new Date(ms);
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(date: Date, days: number): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Sessions with at least one answer count as practice. */
const practised = (sessions: readonly SessionLog[]) => sessions.filter((s) => s.total > 0);

/**
 * Days in a row with practice. Today may still be empty (the streak is alive until the day is over), so counting
 * starts at yesterday when today has no session yet.
 */
export function streakDays(sessions: readonly SessionLog[], now: number): number {
	const days = new Set(practised(sessions).map((s) => dayKey(s.endedAt)));
	let day = startOfDay(now);
	if (!days.has(dayKey(day.getTime()))) day = addDays(day, -1);
	let count = 0;
	while (days.has(dayKey(day.getTime()))) {
		count++;
		day = addDays(day, -1);
	}
	return count;
}

export type DayActivity = { key: string; date: Date; answers: number; sessions: number };

/** The last `days` days, oldest first, today included. */
export function dailyActivity(sessions: readonly SessionLog[], days: number, now: number): DayActivity[] {
	const today = startOfDay(now);
	const out: DayActivity[] = [];
	for (let i = days - 1; i >= 0; i--) {
		const date = addDays(today, -i);
		out.push({ key: dayKey(date.getTime()), date, answers: 0, sessions: 0 });
	}
	const byKey = new Map(out.map((d) => [d.key, d]));
	for (const s of practised(sessions)) {
		const day = byKey.get(dayKey(s.endedAt));
		if (!day) continue;
		day.answers += s.total;
		day.sessions++;
	}
	return out;
}

const WEEKDAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'] as const;

/** Start (00:00) of the Monday of the week that contains `now`. */
export function startOfWeek(now: number): Date {
	const today = startOfDay(now);
	return addDays(today, -((today.getDay() + 6) % 7));
}

/** This week, Monday first, as relative heights (0 = not practised, 1 = the busiest day). */
export function weekActivity(sessions: readonly SessionLog[], now: number): { day: string; amount: number }[] {
	const monday = startOfWeek(now);
	const totals = WEEKDAYS.map(() => 0);
	const weekKeys = WEEKDAYS.map((_, i) => dayKey(addDays(monday, i).getTime()));
	for (const s of practised(sessions)) {
		const i = weekKeys.indexOf(dayKey(s.endedAt));
		if (i >= 0) totals[i] = (totals[i] ?? 0) + s.total;
	}
	const max = Math.max(...totals, 1);
	return WEEKDAYS.map((day, i) => ({ day, amount: (totals[i] ?? 0) / max }));
}

export function sessionsThisWeek(sessions: readonly SessionLog[], now: number): number {
	const from = startOfWeek(now).getTime();
	return practised(sessions).filter((s) => s.endedAt >= from).length;
}

/** Sessions that touched at least one of the given sets. */
export function sessionsForSets(sessions: readonly SessionLog[], setIds: ReadonlySet<string>): SessionLog[] {
	return sessions.filter((s) => s.setIds.some((id) => setIds.has(id)));
}

/** Set ids by most recent practice first; sets never practised come after, in the given order. */
export function recentSetIds(sessions: readonly SessionLog[], allSetIds: readonly string[]): string[] {
	const known = new Set(allSetIds);
	const seen: string[] = [];
	for (const s of [...sessions].sort((a, b) => b.endedAt - a.endedAt)) {
		for (const id of s.setIds) if (known.has(id) && !seen.includes(id)) seen.push(id);
	}
	return [...seen, ...allSetIds.filter((id) => !seen.includes(id))];
}
