// Starting points for a new list ("sjablonen"). Rows are prefilled with their prompts and tags; the learner types the answers.
import type { DraftList, DraftRow } from './types';
import { newId } from '../utils/id';

export type TemplateId = 'declension' | 'conjugation' | 'vocab' | 'custom';

export type TemplateInfo = { id: TemplateId; name: string; description: string; example: string };
export type ComingSoonInfo = Omit<TemplateInfo, 'id'>;

export type TemplateCategory = {
	id: 'rijtjes' | 'woorden' | 'grammatica';
	name: string;
	description: string;
	/** Templates that can be used now. */
	templates: readonly TemplateInfo[];
	/** Shown with a "Binnenkort" badge and not clickable. */
	comingSoon: readonly ComingSoonInfo[];
};

export const TEMPLATE_CATEGORIES: readonly TemplateCategory[] = [
	{
		id: 'rijtjes',
		name: 'Rijtjes',
		description: 'Vormen die je uit je hoofd leert, met stapsgewijs oefenen.',
		templates: [
			{ id: 'declension', name: 'Declinatie', description: 'Enkelvoud en meervoud, nominativus t/m ablativus (bij Grieks zonder ablativus).', example: 'ev nom → mensa' },
			{ id: 'conjugation', name: 'Vervoeging', description: 'Eén tijd: 1e, 2e en 3e persoon, enkelvoud en meervoud.', example: '1 ev → amavi' },
			{ id: 'custom', name: 'Eigen rijtje', description: 'Een rijtje naar eigen idee: zelf rijen en tags bepalen.', example: 'nom ev → puella' }
		],
		comingSoon: []
	},
	{
		id: 'woorden',
		name: 'Woorden',
		description: 'Woordenlijsten met vertalingen.',
		templates: [
			{ id: 'vocab', name: 'Woordenlijst', description: 'Woorden met hun vertaling, om te overhoren in beide richtingen.', example: 'puella → meisje' }
		],
		comingSoon: []
	},
	{
		id: 'grammatica',
		name: 'Grammatica & stijl',
		description: 'Stijlfiguren, participium, coniunctivus en andere regels, met hulp van AI.',
		templates: [],
		comingSoon: [
			{ name: 'Stijlfiguren', description: 'Herken en benoem stijlfiguren in een zin, met uitleg.', example: 'tricolon → drie delen' },
			{ name: 'Grammatica', description: 'Participium, coniunctivus en andere regels, met vragen die AI voor je maakt.', example: 'cum + coniunctivus' }
		]
	}
];

const CASES = ['nom', 'gen', 'dat', 'acc', 'abl'] as const;
const NUMBERS = [
	{ tag: 'sg', label: 'ev' },
	{ tag: 'pl', label: 'mv' }
] as const;
const PERSONS = ['1', '2', '3'] as const;

export function emptyRow(tags: Record<string, string> = {}, prompt = ''): DraftRow {
	return { id: newId(), prompt, answers: [''], tags };
}

/** Greek has no ablative: declension templates for Greek sets leave it out. */
export function createList(template: TemplateId, greek = false): DraftList {
	const base = { id: newId(), template: 'table' as const, group: '' };

	if (template === 'declension') {
		const rows = NUMBERS.flatMap((n) => CASES.filter((c) => !(greek && c === 'abl')).map((c) => emptyRow({ number: n.tag, case: c }, `${n.label} ${c}`)));
		return {
			...base,
			kind: 'declension',
			title: 'Nieuwe declinatie',
			columns: { prompt: 'Vorm', answer: 'Woord' },
			dimensions: ['number', 'case'],
			rows
		};
	}

	if (template === 'conjugation') {
		const rows = NUMBERS.flatMap((n) => PERSONS.map((p) => emptyRow({ tense: 'pres', number: n.tag, person: p }, `${p} ${n.label}`)));
		return {
			...base,
			kind: 'conjugation',
			title: 'Nieuwe vervoeging',
			columns: { prompt: 'Persoon', answer: 'Vorm' },
			dimensions: ['tense', 'number', 'person'],
			rows
		};
	}

	if (template === 'vocab') {
		return {
			...base,
			kind: 'vocab',
			title: 'Nieuwe woordenlijst',
			columns: { prompt: 'Woord', answer: 'Vertaling' },
			dimensions: [],
			rows: [emptyRow(), emptyRow(), emptyRow(), emptyRow(), emptyRow()]
		};
	}

	return {
		...base,
		kind: 'custom',
		title: 'Nieuw rijtje',
		columns: { prompt: 'Vorm', answer: 'Woord' },
		dimensions: [],
		rows: [emptyRow(), emptyRow(), emptyRow()]
	};
}

export const KIND_LABELS: Record<DraftList['kind'], string> = {
	declension: 'Declinatie',
	conjugation: 'Vervoeging',
	vocab: 'Woordjes',
	custom: 'Overig'
};