// Latin-letter -> Greek conversion for the "Grieks toetsenbord" (pure TS, no DOM).
// Phonetic layout (a=α, b=β, g=γ, d=δ, e=ε, z=ζ, h=η, q=θ, i=ι, k=κ, l=λ, m=μ, n=ν, x=ξ, o=ο, p=π, r=ρ, s=σ,
// t=τ, u=υ, f=φ, c=χ, y=ψ, w=ω; Shift = capital). Marks are typed AFTER the letter they belong to:
//   '  acute   `  grave   = or ~  circumflex   )  smooth breathing   (  rough breathing   |  iota subscript   "  diaeresis
// A mark that does not combine with the letter before it (e.g. an accent on a consonant) stays as typed.
// A final sigma is written as ς automatically. Idempotent: text that is already Greek is left alone.

const LETTERS: Readonly<Record<string, string>> = {
	a: 'α', b: 'β', g: 'γ', d: 'δ', e: 'ε', z: 'ζ', h: 'η', q: 'θ', i: 'ι', k: 'κ', l: 'λ', m: 'μ',
	n: 'ν', x: 'ξ', o: 'ο', p: 'π', r: 'ρ', s: 'σ', t: 'τ', u: 'υ', f: 'φ', c: 'χ', y: 'ψ', w: 'ω',
	A: 'Α', B: 'Β', G: 'Γ', D: 'Δ', E: 'Ε', Z: 'Ζ', H: 'Η', Q: 'Θ', I: 'Ι', K: 'Κ', L: 'Λ', M: 'Μ',
	N: 'Ν', X: 'Ξ', O: 'Ο', P: 'Π', R: 'Ρ', S: 'Σ', T: 'Τ', U: 'Υ', F: 'Φ', C: 'Χ', Y: 'Ψ', W: 'Ω'
};

/** Typed mark -> combining character. */
const MARKS: Readonly<Record<string, string>> = {
	"'": '́',
	'`': '̀',
	'=': '͂',
	'~': '͂',
	')': '̓',
	'(': '̔',
	'|': 'ͅ',
	'"': '̈'
};

const GREEK_LETTER = /^[Ͱ-Ͽἀ-῿]$/u;

/** Adds a combining mark to the Greek letter before it; null when the two do not form one character. */
function combine(letter: string, mark: string): string | null {
	if (!GREEK_LETTER.test(letter.normalize('NFC').slice(-1)) && !GREEK_LETTER.test(letter)) return null;
	const composed = (letter + mark).normalize('NFC');
	return [...composed].length === 1 ? composed : null;
}

/** σ at the end of a word (after a letter) becomes ς, and ς followed by a letter becomes σ again (typing continues). */
function fixFinalSigma(text: string): string {
	return text.replace(/(?<=[\p{L}\p{M}])σ(?![\p{L}\p{M}])/gu, 'ς').replace(/ς(?=[\p{L}\p{M}])/gu, 'σ');
}

export function toGreek(text: string): string {
	const out: string[] = [];
	for (const char of text) {
		const letter = LETTERS[char];
		if (letter) {
			out.push(letter);
			continue;
		}
		const mark = MARKS[char];
		const last = out[out.length - 1];
		const joined = mark !== undefined && last !== undefined ? combine(last, mark) : null;
		if (joined !== null) out[out.length - 1] = joined;
		else out.push(char);
	}
	return fixFinalSigma(out.join('').normalize('NFC'));
}
