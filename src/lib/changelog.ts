// What changed per update, newest first. Shown once per device by UpdateModal after an update.
// To announce an update: add an entry at the TOP with the next version (0.90 -> 0.91 -> 0.92 ..., never 1.0 until the owner says so) and short Dutch lines.
export type ChangeKind = 'new' | 'changed' | 'fixed';

export type Update = {
	/** Version, also the unique id: "0.90", "0.91", ... */
	id: string;
	/** ISO date, shown as text. */
	date: string;
	title: string;
	/** Chosen by the AI: a big or a small update. Does not change the numbering. */
	size: 'big' | 'small';
	changes: { kind: ChangeKind; text: string }[];
};

export const CHANGELOG: Update[] = [
	{
		id: '0.91',
		date: '2026-10-24',
		title: 'Versie 0.91',
		size: 'small',
		changes: [
			{ kind: 'new', text: 'Uilen-memory: een nieuwe minigame. Draai bladeren om en zoek de paren, een term en zijn antwoord. Te vinden onder Oefenen > Minigames.' }
		]
	},
	{
		id: '0.90',
		date: '2026-10-24',
		title: 'Versie 0.90',
		size: 'big',
		changes: [
			{ kind: 'new', text: 'Oefen deze map: op “Mijn sets” oefen je nu ook alle sets van één map tegelijk.' },
			{ kind: 'new', text: 'Minigames: de eerste is Uilenvangst, te vinden in het Oefenen-menu van een set.' },
			{ kind: 'new', text: 'Mappen op de vakpagina: sorteer, filter en ordenen je sets per vak, net als op “Mijn sets”.' },
			{ kind: 'changed', text: 'Uitleggen kijkt je antwoord direct na, per begrip. Foute begrippen komen later terug.' },
			{ kind: 'changed', text: 'Uitdagingen tellen alleen nog een toets van de hele set. Doe een eerdere toets opnieuw als hij niet meetelt.' }
		]
	}
];
