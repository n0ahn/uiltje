// Hint ladder (PLAN §6): 1 first letter, 2 length/pattern mask, 3 reveal.
// Works on grapheme clusters so accented/polytonic Greek letters count as one letter.

export type HintLevel = 1 | 2 | 3;

export type Hint = {
	level: HintLevel;
	/** Level 1: the first letter. Level 2: mask like `m _ _ _ a` (words separated by ` · `). Level 3: the answer. */
	text: string;
	/** True for level 3: the answer is shown and counts as wrong. */
	reveals: boolean;
};

const WORD_SEPARATOR = ' · ';
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

function graphemes(text: string): string[] {
	return Array.from(segmenter.segment(text), (s) => s.segment);
}

function isLetter(grapheme: string): boolean {
	return /^[\p{L}\p{N}]/u.test(grapheme);
}

function maskWord(word: string): string {
	const chars = graphemes(word);
	const letterIdx = chars.flatMap((c, i) => (isLetter(c) ? [i] : []));
	// Show first and last letter; words of 1-2 letters show only the first.
	const visible = new Set<number>();
	const first = letterIdx[0];
	const last = letterIdx[letterIdx.length - 1];
	if (first !== undefined) visible.add(first);
	if (last !== undefined && letterIdx.length >= 3) visible.add(last);
	return chars.map((c, i) => (isLetter(c) && !visible.has(i) ? '_' : c)).join(' ');
}

export function buildHint(answer: string, level: HintLevel): Hint {
	const trimmed = answer.normalize('NFC').trim();
	if (level === 3) return { level, text: trimmed, reveals: true };
	if (level === 1) {
		const first = graphemes(trimmed).find(isLetter) ?? '';
		return { level, text: first, reveals: false };
	}
	const words = trimmed.split(/\s+/u).filter((w) => w !== '');
	return { level, text: words.map(maskWord).join(WORD_SEPARATOR), reveals: false };
}