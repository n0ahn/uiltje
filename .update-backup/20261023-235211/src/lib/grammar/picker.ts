// Logic behind the "kies onderdelen" screen (phase 9): which sections a group shows, searching, and turning the picks
// into rows. Pure TS: the component only holds the state.
import { CATALOGUES, getCatalogue } from './catalogues';
import { conceptRows, customItemRows, type ConceptRow, type CustomItem } from './rows';
import type { CommunityItem } from './suggestions-core';
import type { GrammarCatalogue, GrammarItem, GrammarSection, SectionKind } from './types';

export const PICKER_GROUPS = [
	{ id: 'stijl', name: 'Stijlfiguren & retorica', kinds: ['stilistisch', 'narratologisch', 'argumentatief', 'poezie', 'auteur', 'retorica', 'context'] as readonly SectionKind[] },
	// Vormleer (paradigms and forms) is practised with the rijtjes templates; here only items with a definition of their own.
	{ id: 'grammatica', name: 'Grammatica', kinds: ['syntaxis', 'ionisch'] as readonly SectionKind[] }
] as const;
export type PickerGroupId = (typeof PICKER_GROUPS)[number]['id'];

/** The catalogue that belongs to a subject name ("Latijn", "latin " ...); undefined for other subjects. */
export function catalogueForSubject(subject: string): GrammarCatalogue | undefined {
	const clean = subject.trim().toLowerCase();
	if (/^(latijn|latin)$/.test(clean)) return getCatalogue('ltc-2027');
	if (/^(grieks|greek)$/.test(clean)) return getCatalogue('gtc-2027');
	return undefined;
}

export const DEFAULT_CATALOGUE: GrammarCatalogue = CATALOGUES[0]!;

export function refOf(catalogue: GrammarCatalogue, item: GrammarItem): string {
	return `${catalogue.id}/${item.id}`;
}

/** Sections of one group, without the items the syllabus says are NOT required and without bare topics (no good question). */
export function sectionsFor(catalogue: GrammarCatalogue, group: PickerGroupId): GrammarSection[] {
	const kinds = PICKER_GROUPS.find((g) => g.id === group)?.kinds ?? [];
	return catalogue.sections
		.filter((section) => kinds.includes(section.kind))
		.map((section) => ({ ...section, items: section.items.filter((item) => !item.notRequired && !item.topic) }))
		.filter((section) => section.items.length > 0);
}

/** Case- and accent-insensitive match on the term and the explanation. An empty query keeps everything. */
export function matchesQuery(item: Pick<GrammarItem, 'term' | 'summary'>, query: string): boolean {
	const clean = normalize(query);
	if (clean === '') return true;
	return normalize(`${item.term} ${item.summary}`).includes(clean);
}

function normalize(text: string): string {
	return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

export type Selection = {
	catalogue: GrammarCatalogue;
	/** Refs of the catalogue items that are ticked. */
	refs: readonly string[];
	community: readonly CommunityItem[];
	/** Ids (not refs) of the ticked community items. */
	communityIds: readonly string[];
	custom: readonly CustomItem[];
	withExamples: boolean;
};

/** The rows for everything that is ticked or typed in, in a stable order: catalogue, community, own items. */
export function buildRows(selection: Selection): ConceptRow[] {
	const rows: ConceptRow[] = [];
	const wanted = new Set(selection.refs);
	for (const section of selection.catalogue.sections) {
		for (const item of section.items) {
			const ref = refOf(selection.catalogue, item);
			if (wanted.has(ref)) rows.push(...conceptRows(item, { ref, withExamples: selection.withExamples }));
		}
	}
	const communityWanted = new Set(selection.communityIds);
	for (const item of selection.community) {
		if (!communityWanted.has(item.id)) continue;
		rows.push(...customItemRows({ term: item.term, definition: item.definition, example: item.example, exampleTranslation: item.exampleTranslation }, `community/${item.id}`));
	}
	for (const custom of selection.custom) rows.push(...customItemRows(custom));
	// Two items can share an explanation (e.g. enjambement for Homerus and for the tragedie): ask it once.
	const seen = new Set<string>();
	return rows.filter((row) => {
		const key = row.prompt.trim().toLowerCase();
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}
