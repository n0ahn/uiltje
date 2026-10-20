import type { Direction, StepBack } from '../../engine/blocks';
import type { Strictness } from '../../engine/options';

export type PracticeKind = 'rijtjes' | 'woorden';

export type PracticeConfig = {
	/** Rijtjes (blocks of forms) or woorden (vocabulary rounds). */
	kind: PracticeKind;
	/** Which lists of which set take part: setId -> listIds. */
	selection: Record<string, string[]>;
	mode: 'learn' | 'test';
	direction: Direction;
	/** Learn mode: what happens when a block goes badly. */
	stepBack: StepBack;
	strictness: Strictness;
	/** Test: how many forms to ask (random pick), null = all of them. */
	questionCount: number | null;
	/** Test: time limit in minutes, null = no limit. */
	timeLimitMinutes: number | null;
	/** Retry: only these rows (row keys), null = everything that was selected. */
	onlyRowKeys: string[] | null;
};

type Option<T> = { id: T; name: string; text: string };

export const MODE_OPTIONS: readonly Option<PracticeConfig['mode']>[] = [
	{ id: 'learn', name: 'Leren', text: 'Hints en opnieuw proberen, tot elk blok goed is.' },
	{ id: 'test', name: 'Toets', text: 'Eén keer invullen, het resultaat zie je aan het eind.' }
];

export const DIRECTION_OPTIONS: readonly { id: Direction; name: string; example: string; text: string }[] = [
	{ id: 'forward', name: 'Bepaling → vorm', example: 'ev gen → mensae', text: 'ev gen → mensae' },
	{ id: 'reverse', name: 'Vorm → bepaling', example: 'mensae → ev gen', text: 'mensae → ev gen' },
	{ id: 'both', name: 'Beide', example: 'eerst de ene, dan de andere kant', text: 'eerst de ene, dan de andere kant' }
];

export const VOCAB_DIRECTION_OPTIONS: readonly { id: Direction; name: string }[] = [
	{ id: 'forward', name: 'Term → vertaling' },
	{ id: 'reverse', name: 'Vertaling → term' },
	{ id: 'both', name: 'Beide' }
];

export const STEP_BACK_OPTIONS: readonly Option<StepBack>[] = [
	{ id: 'stage', name: 'Stap terug', text: 'Gaat een blok slecht, dan herhaal je eerst het vorige stadium.' },
	{ id: 'row', name: 'Lastige vormen', text: 'Vormen die vaak fout gaan krijgen een extra oefenblok.' },
	{ id: 'none', name: 'Uit', text: 'Altijd gewoon doorgaan met het volgende blok.' }
];

export const STRICTNESS_OPTIONS: readonly Option<Strictness>[] = [
	{ id: 'set', name: 'Zoals in de set', text: 'Elke set bepaalt zelf of accenten tellen.' },
	{ id: 'strict', name: 'Streng', text: 'Accenten en lange klinkers (macrons) moeten kloppen.' },
	{ id: 'relaxed', name: 'Soepel', text: 'Accenten en macrons mogen ontbreken.' }
];

export const QUESTION_COUNT_CHOICES = [10, 20, 30, 50] as const;
export const TIME_LIMIT_CHOICES = [2, 5, 10, 15, 30] as const;