// Dutch copy for the notification centre. Facts are kept modest ("vaak", "voor veel mensen"): learning research
// gives tendencies, not guarantees. Order alternates fact / motivation, so the daily one stays varied.
import type { TipContent } from './types';

export const WELCOME = {
	title: 'Welkom bij Uiltje',
	text: 'Maak een set, oefen een paar minuten per dag en ik houd je voortgang bij. Hieronder een paar weetjes over hoe leren werkt.'
};

export const TIPS: readonly TipContent[] = [
	{
		kind: 'weetje',
		title: 'Spreiden werkt beter dan blokken',
		text: 'Vijf keer tien minuten verspreid over een week blijft meestal beter hangen dan één keer vijftig minuten. Dat heet het spacing-effect.'
	},
	{
		kind: 'motivatie',
		title: 'Kleine stapjes, grote vooruitgang',
		text: 'Elke dag even oefenen telt zwaarder dan af en toe heel veel. Een paar minuten is al een goed begin.'
	},
	{
		kind: 'weetje',
		title: 'Overhoren is slimmer dan herlezen',
		text: 'Een antwoord uit je geheugen halen versterkt wat je weet meer dan het nog eens doorlezen. Precies wat je in Uiltje doet.'
	},
	{
		kind: 'motivatie',
		title: 'Fouten horen erbij',
		text: 'Een antwoord proberen en het fout hebben helpt je meestal om het juiste antwoord daarna beter te onthouden. Geen zorgen dus.'
	},
	{
		kind: 'weetje',
		title: 'Slaap helpt je geheugen',
		text: 'Tijdens de slaap verwerkt je brein wat je overdag hebt geleerd. Een nachtje slapen na het oefenen is geen verloren tijd.'
	},
	{
		kind: 'weetje',
		title: 'School komt uit het Grieks',
		text: 'Ons woord "school" komt via het Latijn van het Griekse scholè, dat "vrije tijd" betekende. Leren was vroeger iets voor je vrije tijd.'
	},
	{
		kind: 'motivatie',
		title: 'Een slechte dag?',
		text: 'Eén blokje oefenen is genoeg om je reeks te houden. Het hoeft niet perfect, het hoeft alleen vandaag.'
	},
	{
		kind: 'weetje',
		title: 'Hardop zeggen helpt',
		text: 'Woorden die je hardop uitspreekt onthoud je vaak beter dan woorden die je alleen leest. Dat heet het productie-effect.'
	},
	{
		kind: 'weetje',
		title: 'Moeite is een goed teken',
		text: 'Als oefenen een beetje moeite kost, ben je meestal op de goede weg. Iets wat meteen vanzelf gaat, blijft vaak minder lang hangen.'
	},
	{
		kind: 'motivatie',
		title: 'Je hoeft niet alles te kunnen',
		text: 'Je hoeft nog niet alles te weten. Elk onderdeel dat je onder de knie krijgt, is er één minder om je zorgen over te maken.'
	},
	{
		kind: 'weetje',
		title: 'Een uil als mascotte',
		text: 'De uil was het symbool van Athena, de Griekse godin van wijsheid. Daarom is Uiltje je leercompagnon.'
	},
	{
		kind: 'weetje',
		title: 'Vergeten gaat in het begin snel',
		text: 'Rond 1885 liet Hermann Ebbinghaus zien dat we zonder herhaling het meeste snel vergeten. Een snelle herhaling na een dag of twee werkt daarom goed.'
	},
	{
		kind: 'motivatie',
		title: 'Jij bent bezig, dat telt',
		text: 'Veel mensen blijven bij plannen. Jij oefent echt. Dat verdient af en toe een schouderklopje.'
	},
	{
		kind: 'weetje',
		title: 'Meng de soorten door elkaar',
		text: 'Verschillende soorten vormen door elkaar oefenen voelt lastiger dan alles van één soort achter elkaar, maar werkt vaak beter.'
	},
	{
		kind: 'weetje',
		title: 'Leg het aan een ander uit',
		text: 'Als je iets aan iemand anders uitlegt, merk je meteen waar je nog blijft hangen. Een vriend of vriendin die meeoefent helpt dus echt.'
	},
	{
		kind: 'motivatie',
		title: 'Even pauze mag',
		text: 'Een korte pauze na een blok laat het geleerde beter landen. Pak even water of loop een rondje, daarna ga je weer verder.'
	}
];

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
