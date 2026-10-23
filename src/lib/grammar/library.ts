// The library (phase 10): ready-made sets built from the verified catalogues, to add to "Mijn sets" with one click.
// Pure TS. Nothing is stored here: a set is built from the catalogue (and the approved questions) when it is added,
// so a library set always matches the syllabus text and the questions the owner approved at that moment.
import { CATALOGUES } from './catalogues';
import { buildRows, refOf, sectionsFor, type PickerGroupId } from './picker';
import type { ApprovedQuestion } from './questions-core';
import { PRINCIPAL_PARTS } from './principal-parts';
import { parseStudySet } from '../schema/migrate';
import { SCHEMA_VERSION } from '../schema/types';
import type { ListKind, StudySet } from '../schema/types';
import type { GrammarCatalogue } from './types';

export type LibraryList = { title: string; kind: ListKind; columns: { prompt: string; answer: string }; rows: { prompt: string; answers: string[]; ref?: string }[] };

export type LibraryEntry = {
	id: string;
	title: string;
	subject: 'Latijn' | 'Grieks';
	description: string;
	/** Where the content comes from, shown on the card. */
	source: string;
	lists: LibraryList[];
	questionCount: number;
};

const CONCEPT_COLUMNS = { prompt: 'Uitleg of voorbeeld', answer: 'Term' };

function conceptEntry(catalogue: GrammarCatalogue, group: PickerGroupId, bank: readonly ApprovedQuestion[]): LibraryEntry | null {
	const sections = sectionsFor(catalogue, group);
	const lists: LibraryList[] = sections
		.map((section) => ({
			title: section.title,
			kind: 'concept' as const,
			columns: CONCEPT_COLUMNS,
			rows: buildRows({ catalogue, refs: section.items.map((item) => refOf(catalogue, item)), community: [], communityIds: [], custom: [], withExamples: true, bank })
		}))
		.filter((list) => list.rows.length > 0);
	if (lists.length === 0) return null;
	const stijl = group === 'stijl';
	return {
		id: `${catalogue.id}/${group}`,
		title: `${stijl ? 'Stijlfiguren & retorica' : 'Grammatica: syntaxis'} ${catalogue.subject} ${catalogue.examYear}`,
		subject: catalogue.subject,
		description: stijl
			? 'Alle stijlfiguren, verteltechnieken en argumentatieve middelen van het examenprogramma, met uitleg en voorbeelden.'
			: catalogue.subject === 'Grieks'
				? 'Alle syntaxisregels van het examenprogramma, plus het Ionisch van Herodotus.'
				: 'Alle syntaxisregels van het examenprogramma: naamvallen, gebruik van tijden, coniunctivus, participium en meer.',
		source: `${catalogue.source.publisher}, ${catalogue.source.title}`,
		lists,
		questionCount: lists.reduce((n, l) => n + l.rows.length, 0)
	};
}

/** "accipio" -> "accepi acceptum". A dash means "no such form". Forms are separated by spaces (the checker compares exactly). */
function formsOf(forms: readonly string[]): string {
	return forms.filter((form) => form !== '-').join(' ');
}

function stamtijdenEntry(): LibraryEntry {
	const required = PRINCIPAL_PARTS.filter((p) => !p.notRequired);
	const list = (title: string, deponent: boolean): LibraryList => ({
		title,
		kind: 'vocab',
		columns: { prompt: 'Werkwoord', answer: 'Stamtijden' },
		rows: required.filter((p) => p.deponent === deponent && formsOf(p.forms) !== '').map((p) => ({ prompt: p.verb, answers: [formsOf(p.forms)] }))
	});
	const lists = [list('Werkwoorden', false), list('Deponentia en semi-deponentia', true)];
	const catalogue = CATALOGUES.find((c) => c.id === 'ltc-2027')!;
	return {
		id: 'ltc-2027/stamtijden',
		title: `Stamtijden Latijn ${catalogue.examYear}`,
		subject: 'Latijn',
		description: 'De stamtijden die je moet kennen, zonder de werkwoorden die de syllabus als niet vereist markeert. Typ de vormen met een spatie ertussen, bijvoorbeeld "accepi acceptum".',
		source: `${catalogue.source.publisher}, ${catalogue.source.title}`,
		lists,
		questionCount: lists.reduce((n, l) => n + l.rows.length, 0)
	};
}

/** All library sets. `banks` holds the approved AI questions per catalogue id (empty when not loaded or signed out). */
export function buildLibrary(banks: Readonly<Record<string, readonly ApprovedQuestion[]>> = {}): LibraryEntry[] {
	const entries: (LibraryEntry | null)[] = [];
	for (const catalogue of CATALOGUES) {
		entries.push(conceptEntry(catalogue, 'stijl', banks[catalogue.id] ?? []), conceptEntry(catalogue, 'grammatica', banks[catalogue.id] ?? []));
		if (catalogue.id === 'ltc-2027') entries.push(stamtijdenEntry());
	}
	return entries.filter((entry): entry is LibraryEntry => entry !== null);
}

/** A fresh StudySet from a library entry (new ids every time, so adding it twice gives two independent sets). */
export function entryToStudySet(entry: LibraryEntry, newId: () => string): { ok: true; set: StudySet } | { ok: false; issues: string[] } {
	const result = parseStudySet({
		schemaVersion: SCHEMA_VERSION,
		id: newId(),
		title: entry.title,
		subject: entry.subject,
		folder: null,
		settings: { keyboard: entry.subject === 'Grieks' ? 'greek' : 'default' },
		lists: entry.lists.map((list) => ({
			id: newId(),
			template: 'table',
			kind: list.kind,
			title: list.title,
			group: null,
			columns: list.columns,
			dimensions: [],
			rows: list.rows.map((row) => ({ id: newId(), prompt: row.prompt, answers: row.answers, tags: {}, ...(row.ref ? { ref: row.ref } : {}) }))
		}))
	});
	return result.ok ? { ok: true, set: result.set } : { ok: false, issues: result.issues };
}
