// Dutch copy for the notification centre: the welcome and milestones (no tips, no motivational lines).

export const WELCOME = {
	title: 'Welkom bij Uiltje',
	text: 'Maak een set en oefen een paar minuten per dag. Ik houd je voortgang bij.'
};

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100] as const;
export const ANSWER_MILESTONES = [100, 250, 500, 1000, 2500, 5000, 10000] as const;

export function streakNotice(days: number): { title: string; text: string } {
	return {
		title: `${days} dagen op rij`,
		text: days >= 30 ? 'Wat een volhouder. Dit is echt een gewoonte geworden.' : days >= 7 ? 'Een hele week of meer. Goed bezig!' : 'Je reeks groeit. Blijf het zo doen.'
	};
}

export function answersNotice(total: number): { title: string; text: string } {
	return { title: `${total} antwoorden gegeven`, text: 'Elk antwoord brengt je dichter bij onder de knie. Mooie mijlpaal.' };
}
