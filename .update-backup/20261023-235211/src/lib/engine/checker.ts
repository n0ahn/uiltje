// Answer checking (PLAN §7). Pure TS, no typo tolerance in v1.
import type { SetSettings } from '../schema/types';

export type CheckSettings = Pick<SetSettings, 'strictAccents' | 'strictMacrons' | 'caseSensitive'>;

/**
 * Normalizes text for comparison:
 * NFC, trim, collapse whitespace, case (unless caseSensitive), final sigma, then
 * - strictAccents off: strip every combining mark (macrons too, unless strictMacrons),
 * - strictMacrons off: strip U+0304 only.
 */
export function normalizeAnswer(input: string, settings: CheckSettings): string {
	let text = input.normalize('NFC').trim().replace(/\s+/gu, ' ');
	if (!settings.caseSensitive) text = text.toLowerCase();
	text = text.replace(/ς/gu, 'σ');

	if (!settings.strictAccents) {
		// Keep the macron only when macrons are strict.
		const marks = settings.strictMacrons ? /(?!̄)\p{M}/gu : /\p{M}/gu;
		text = text.normalize('NFD').replace(marks, '').normalize('NFC');
	} else if (!settings.strictMacrons) {
		text = text.normalize('NFD').replace(/̄/gu, '').normalize('NFC');
	}
	return text;
}

export type CheckResult = {
	correct: boolean;
	/** The accepted answers (as stored) that the input matched. */
	matched: string[];
};

/**
 * Accepts any single entry of `answers`. When a row has several answers the user may also type
 * them all as `a/b`: every part must match a different accepted answer.
 */
export function checkAnswer(input: string, answers: readonly string[], settings: CheckSettings): CheckResult {
	const given = normalizeAnswer(input, settings);
	if (given === '') return { correct: false, matched: [] };

	const accepted = answers.map((raw) => ({ raw, norm: normalizeAnswer(raw, settings) }));

	const direct = accepted.filter((a) => a.norm === given);
	if (direct.length > 0) return { correct: true, matched: [...new Set(direct.map((a) => a.raw))] };

	if (given.includes('/')) {
		const parts = given.split('/').map((p) => p.trim());
		if (parts.length > 1 && parts.every((p) => p !== '') && new Set(parts).size === parts.length) {
			const matched: string[] = [];
			for (const part of parts) {
				const hit = accepted.find((a) => a.norm === part);
				if (!hit) return { correct: false, matched: [] };
				matched.push(hit.raw);
			}
			return { correct: true, matched };
		}
	}
	return { correct: false, matched: [] };
}