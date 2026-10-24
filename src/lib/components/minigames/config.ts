// Minigames: the list of games (shown on the minigames page) and the options of Uilenvangst.
// Pure TS. A game that is not `ready` shows as "Binnenkort".
import type { CatchDirection, CatchSpeed } from '../../engine/catch';

export type GameId = 'uilenvangst' | 'uilen-memory' | 'nachtvlucht' | 'nestbouwer';

export type GameInfo = {
	id: GameId;
	name: string;
	/** One or two short sentences. */
	text: string;
	/** What it practises, shown as small chips. */
	for: readonly string[];
	art: 'catch' | 'memory' | 'flight' | 'nest';
	ready: boolean;
};

export const GAMES: readonly GameInfo[] = [
	{
		id: 'uilenvangst',
		name: 'Uilenvangst',
		text: 'De uilen vallen uit de boom, elk met een antwoord. Schuif je mand onder de uil met het goede antwoord en vang ze allemaal.',
		for: ['Woordjes', 'Rijtjes', 'Begrippen'],
		art: 'catch',
		ready: true
	},
	{
		id: 'uilen-memory',
		name: 'Uilen-memory',
		text: 'Draai de bladeren om en zoek de paren: een term en zijn vertaling horen bij elkaar.',
		for: ['Woordjes', 'Begrippen'],
		art: 'memory',
		ready: true
	},
	{
		id: 'nachtvlucht',
		name: 'Nachtvlucht',
		text: 'Vlieg als uil door de nacht en kies bij elke boom de opening met het goede antwoord.',
		for: ['Woordjes', 'Rijtjes'],
		art: 'flight',
		ready: false
	},
	{
		id: 'nestbouwer',
		name: 'Nestbouwer',
		text: 'Sleep de takjes naar het goede nest: elke naamval, tijd of persoon heeft zijn eigen nest.',
		for: ['Rijtjes'],
		art: 'nest',
		ready: false
	}
];

export const gameById = (id: string): GameInfo | undefined => GAMES.find((game) => game.id === id);

/** `?selection=1` keeps working here: the minigames use the same picked terms as the other practice modes. */
export type CatchConfig = {
	/** setId -> listIds. */
	selection: Record<string, string[]>;
	direction: CatchDirection;
	/** How many owls to catch, null = all of them. */
	count: number | null;
	speed: CatchSpeed;
	/** Retry: only these rows (row keys), null = everything that was selected. */
	onlyRowKeys: string[] | null;
};

export const COUNT_CHOICES = [10, 20, 30] as const;

export const SPEED_OPTIONS: readonly { id: CatchSpeed; name: string; text: string }[] = [
	{ id: 'calm', name: 'Rustig', text: 'De uilen vallen langzaam: genoeg tijd om te lezen en na te denken.' },
	{ id: 'normal', name: 'Normaal', text: 'Een prettig tempo voor woorden die je al een beetje kent.' },
	{ id: 'fast', name: 'Snel', text: 'Voor wie het al weet: de uilen vallen vlot.' }
];

/** Uilen-memory: no direction (a pair is a term and its answer) and no speed. */
export type MemoryConfig = {
	/** setId -> listIds. */
	selection: Record<string, string[]>;
	/** How many pairs to find. */
	pairs: number;
	/** Retry: only these rows (row keys), null = everything that was selected. */
	onlyRowKeys: string[] | null;
};

export const PAIR_CHOICES = [6, 8, 10, 12] as const;
