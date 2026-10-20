// Sample Latin set: declensions 1-5 (mensa, dominus, rex, manus, dies) and perfectum (amo, moneo, audio).
// Built from compact tables; the caller supplies the id generator (e.g. () => crypto.randomUUID())
// so every import gets fresh ids. `latinSeed` uses stable sequential ids for tests and static data.
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from '../schema/types';
import type { StudyList, StudyRow, StudySet } from '../schema/types';

type Forms = string | readonly string[];
type Five = readonly [Forms, Forms, Forms, Forms, Forms];
type Six = readonly [Forms, Forms, Forms, Forms, Forms, Forms];

const CASES = ['nom', 'gen', 'dat', 'acc', 'abl'] as const;
const NUMBERS = [
	{ tag: 'sg', label: 'ev' },
	{ tag: 'pl', label: 'mv' }
] as const;
const PERSONS = ['1', '2', '3'] as const;

const answers = (forms: Forms): string[] => (typeof forms === 'string' ? [forms] : [...forms]);

function declension(nextId: () => string, title: string, sg: Five, pl: Five): StudyList {
	const rows: StudyRow[] = [];
	for (const [n, forms] of [
		[NUMBERS[0], sg],
		[NUMBERS[1], pl]
	] as const) {
		CASES.forEach((c, i) => {
			rows.push({
				id: nextId(),
				prompt: `${n.label} ${c}`,
				answers: answers(forms[i] as Forms),
				tags: { number: n.tag, case: c }
			});
		});
	}
	return {
		id: nextId(),
		template: 'table',
		kind: 'declension',
		title,
		group: 'Declinaties',
		columns: { prompt: 'Vorm', answer: 'Woord' },
		dimensions: ['number', 'case'],
		rows
	};
}

/** Forms in order: 1sg 2sg 3sg 1pl 2pl 3pl. */
function perfectum(nextId: () => string, title: string, forms: Six): StudyList {
	const rows: StudyRow[] = [];
	let i = 0;
	for (const n of NUMBERS) {
		for (const person of PERSONS) {
			rows.push({
				id: nextId(),
				prompt: `${person} ${n.label}`,
				answers: answers(forms[i++] as Forms),
				tags: { tense: 'perf', number: n.tag, person }
			});
		}
	}
	return {
		id: nextId(),
		template: 'table',
		kind: 'conjugation',
		title,
		group: 'Perfectum',
		columns: { prompt: 'Persoon', answer: 'Vorm' },
		dimensions: ['number', 'person'],
		rows
	};
}

export function buildLatinSeed(nextId: () => string): StudySet {
	return {
		schemaVersion: SCHEMA_VERSION,
		id: nextId(),
		title: 'Latijn: declinaties en perfectum',
		subject: 'latin',
		folder: null,
		settings: { ...DEFAULT_SETTINGS },
		lists: [
			declension(
				nextId,
				'mensa (1e declinatie)',
				['mensa', 'mensae', 'mensae', 'mensam', 'mensa'],
				['mensae', 'mensarum', 'mensis', 'mensas', 'mensis']
			),
			declension(
				nextId,
				'dominus (2e declinatie)',
				['dominus', 'domini', 'domino', 'dominum', 'domino'],
				['domini', 'dominorum', 'dominis', 'dominos', 'dominis']
			),
			declension(
				nextId,
				'rex (3e declinatie)',
				['rex', 'regis', 'regi', 'regem', 'rege'],
				['reges', 'regum', 'regibus', 'reges', 'regibus']
			),
			declension(
				nextId,
				'manus (4e declinatie)',
				['manus', 'manus', ['manui', 'manu'], 'manum', 'manu'],
				['manus', 'manuum', 'manibus', 'manus', 'manibus']
			),
			declension(
				nextId,
				'dies (5e declinatie)',
				['dies', 'diei', 'diei', 'diem', 'die'],
				['dies', 'dierum', 'diebus', 'dies', 'diebus']
			),
			perfectum(nextId, 'amare: perfectum', [
				'amavi',
				'amavisti',
				'amavit',
				'amavimus',
				'amavistis',
				['amaverunt', 'amavere']
			]),
			perfectum(nextId, 'monere: perfectum', [
				'monui',
				'monuisti',
				'monuit',
				'monuimus',
				'monuistis',
				['monuerunt', 'monuere']
			]),
			perfectum(nextId, 'audire: perfectum', [
				'audivi',
				'audivisti',
				'audivit',
				'audivimus',
				'audivistis',
				['audiverunt', 'audivere']
			])
		]
	};
}

/** UUID-shaped, deterministic ids: 00000000-0000-4000-8000-000000000001, ... */
export function sequentialIds(): () => string {
	let n = 0;
	return () => `00000000-0000-4000-8000-${(++n).toString(16).padStart(12, '0')}`;
}

export const latinSeed: StudySet = buildLatinSeed(sequentialIds());