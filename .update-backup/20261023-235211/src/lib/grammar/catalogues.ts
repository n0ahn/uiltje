// Registry of the verified grammar catalogues. Questions reference an item as `${catalogueId}/${itemId}`.
import { GTC_2027 } from './gtc-2027';
import { LTC_2027 } from './ltc-2027';
import type { GrammarCatalogue, GrammarItem, GrammarSection } from './types';

export const CATALOGUES: readonly GrammarCatalogue[] = [LTC_2027, GTC_2027];

export type ItemRef = `${GrammarCatalogue['id']}/${string}`;

export function getCatalogue(id: string): GrammarCatalogue | undefined {
	return CATALOGUES.find((c) => c.id === id);
}

/** Resolves "ltc-2027/anafora". Undefined when the catalogue or item no longer exists (e.g. an old question). */
export function resolveItem(ref: string): { catalogue: GrammarCatalogue; section: GrammarSection; item: GrammarItem } | undefined {
	const slash = ref.indexOf('/');
	if (slash === -1) return undefined;
	const catalogue = getCatalogue(ref.slice(0, slash));
	if (!catalogue) return undefined;
	const itemId = ref.slice(slash + 1);
	for (const section of catalogue.sections) {
		const item = section.items.find((it) => it.id === itemId);
		if (item) return { catalogue, section, item };
	}
	return undefined;
}
