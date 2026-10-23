// Wording of the practice screens that depends on what is practised: words (vocab) or begrippen (stijlfiguren, grammar).
// Pure TS. A mixed selection uses the word wording; only a selection of nothing but begrippen says "begrippen".
import type { ListKind } from '../../schema/types';

export type Wording = {
	/** "woorden" or "begrippen". */
	items: string;
	/** Shown when there is nothing to practise. */
	empty: string;
};

export function wordingFor(kinds: readonly ListKind[]): Wording {
	const concepts = kinds.length > 0 && kinds.every((kind) => kind === 'concept');
	return concepts ? { items: 'begrippen', empty: 'Er zijn geen begrippen om te oefenen.' } : { items: 'woorden', empty: 'Er zijn geen woorden om te oefenen.' };
}

/** The small label above a question. A begrip is asked as "welke term hoort hierbij?", never as "vertaal". */
export function wayLabelFor(way: 'forward' | 'reverse', kind?: ListKind): string {
	if (kind === 'concept') return way === 'forward' ? 'Welke term hoort hierbij?' : 'Wat betekent dit?';
	return way === 'forward' ? 'Vertaal' : 'Terug';
}
