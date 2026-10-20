// Account/device settings (PLAN §8, phase 3 and 4). Pure TS: validated by hand on every read, so a damaged
// or older entry never crashes the app, it just falls back to the defaults.
import type { Direction } from '../engine/blocks';
import type { Strictness } from '../engine/options';
import type { StepBack } from '../engine/session';
import { LEVELS } from '../schema/types';
import type { Level } from '../schema/types';

export type UserSettings = {
	/** Global level. Only used by AI-generated questions (later), not by practice. */
	level: Level;
	/** Defaults for a new practice session; each session can override them on the start screen. */
	practice: { direction: Direction; stepBack: StepBack; strictness: Strictness };
	test: { showGrade: boolean };
	sound: { enabled: boolean };
};

export const DEFAULT_USER_SETTINGS: Readonly<UserSettings> = {
	level: 'vwo',
	practice: { direction: 'forward', stepBack: 'stage', strictness: 'set' },
	test: { showGrade: true },
	sound: { enabled: true }
};

export const LEVEL_LABELS: Record<Level, string> = {
	'vmbo-b': 'Vmbo-b',
	'vmbo-k': 'Vmbo-k',
	'vmbo-gt': 'Vmbo-gt',
	havo: 'Havo',
	vwo: 'Vwo',
	gym: 'Gymnasium'
};

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
	return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function flag(value: unknown, fallback: boolean): boolean {
	return typeof value === 'boolean' ? value : fallback;
}

function object(value: unknown): Record<string, unknown> {
	return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function parseUserSettings(raw: unknown): UserSettings {
	const root = object(raw);
	const practice = object(root.practice);
	const d = DEFAULT_USER_SETTINGS;
	return {
		level: pick(root.level, LEVELS, d.level),
		practice: {
			direction: pick(practice.direction, ['forward', 'reverse', 'both'] as const, d.practice.direction),
			stepBack: pick(practice.stepBack, ['none', 'row', 'stage'] as const, d.practice.stepBack),
			strictness: pick(practice.strictness, ['set', 'strict', 'relaxed'] as const, d.practice.strictness)
		},
		test: { showGrade: flag(object(root.test).showGrade, d.test.showGrade) },
		sound: { enabled: flag(object(root.sound).enabled, d.sound.enabled) }
	};
}
