// Import of a card export from Quizlet, StudyGo and similar apps: plain text, one card per line (or per block),
// term and definition separated by a tab, ";", " - ", "=" or ",". Pure TS: no Svelte, DOM or Supabase imports.
import { parseStudySet } from '../schema/migrate';
import type { StudySet } from '../schema/types';

export type TermSeparator = 'auto' | 'tab' | 'semicolon' | 'dash' | 'equals' | 'comma';
export type CardSeparator = 'line' | 'blank';
export type SplitAnswers = 'none' | 'slash' | 'semicolon' | 'comma';
export type CardOptions = { term: TermSeparator; cards: CardSeparator; split: SplitAnswers };
export const DEFAULT_CARD_OPTIONS: CardOptions = { term: 'auto', cards: 'line', split: 'none' };

export type ImportedCard = { prompt: string; answers: string[] };
export type CardParse = { cards: ImportedCard[]; skipped: number; term: Exclude<TermSeparator, 'auto'> | null };

const SEPARATORS: Record<Exclude<TermSeparator, 'auto'>, RegExp> = {
	tab: /\t/,
	semicolon: /;/,
	dash: / [-–—] /,
	equals: /=/,
	comma: /,/
};
// Tried in this order when detecting: a tab is what Quizlet and StudyGo export by default; a comma is the last resort.
const DETECT_ORDER = ['tab', 'semicolon', 'dash', 'equals', 'comma'] as const;

const SPLITTERS: Record<Exclude<SplitAnswers, 'none'>, RegExp> = { slash: /\s*\/\s*/, semicolon: /\s*;\s*/, comma: /\s*,\s*/ };

function units(text: string, cards: CardSeparator): string[] {
	const clean = text.replace(/\r\n?/g, '\n').trim();
	if (clean === '') return [];
	return (cards === 'blank' ? clean.split(/\n\s*\n/) : clean.split('\n')).map((u) => u.trim()).filter(Boolean);
}

function detect(list: string[]): Exclude<TermSeparator, 'auto'> | null {
	if (list.length === 0) return null;
	for (const name of DETECT_ORDER) {
		const hits = list.filter((u) => SEPARATORS[name].test(u)).length;
		if (hits * 2 >= list.length) return name;
	}
	return null;
}

export function parseCards(text: string, options: CardOptions = DEFAULT_CARD_OPTIONS): CardParse {
	const list = units(text, options.cards);
	const term = options.term === 'auto' ? detect(list) : options.term;
	const cards: ImportedCard[] = [];
	let skipped = 0;
	for (const unit of list) {
		let prompt = '';
		let rest = '';
		const match = term ? SEPARATORS[term].exec(unit) : null;
		if (match) {
			prompt = unit.slice(0, match.index).trim();
			rest = unit.slice(match.index + match[0].length).trim();
		} else if (options.cards === 'blank' && unit.includes('\n')) {
			// A block of two or more lines without a separator: first line is the term, the rest the definition.
			const [first = '', ...others] = unit.split('\n');
			prompt = first.trim();
			rest = others.map((l) => l.trim()).filter(Boolean).join(' ');
		}
		const parts = options.split === 'none' ? [rest] : rest.split(SPLITTERS[options.split]);
		const answers = [...new Set(parts.map((p) => p.trim()).filter(Boolean))];
		if (!prompt || answers.length === 0) skipped++;
		else cards.push({ prompt, answers });
	}
	return { cards, skipped, term };
}

/** One vocab list with every card. Returns null when there is nothing valid to make a set of. */
export function cardsToSet(cards: ImportedCard[], meta: { title: string; subject: string; folder?: string }, newId: () => string): StudySet | null {
	if (cards.length === 0) return null;
	const subject = meta.subject.trim() || 'Overig';
	const title = meta.title.trim() || 'Geïmporteerde set';
	const result = parseStudySet({
		id: newId(),
		title,
		subject,
		folder: meta.folder?.trim() || null,
		settings: { keyboard: /^(grieks|greek)$/i.test(subject) ? 'greek' : 'default' },
		lists: [
			{
				id: newId(),
				template: 'table',
				kind: 'vocab',
				title,
				group: null,
				columns: { prompt: 'Woord', answer: 'Vertaling' },
				dimensions: [],
				rows: cards.map((card) => ({ id: newId(), prompt: card.prompt, answers: card.answers, tags: {} }))
			}
		]
	});
	return result.ok ? result.set : null;
}
