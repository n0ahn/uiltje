// What a Latin student must know for the centraal examen Latijnse taal en cultuur vwo 2027: the CvTE "minimumlijst"
// (vormleer, syntaxis, literaire termen) and the 2027 rhetoric background. Summaries are written in our own words;
// the syllabus is the authority. Check against the source when it changes (a new syllabus appears every year).
import type { GrammarCatalogue, GrammarItem, GrammarSection } from './types';

export const LTC_2027_SOURCE = {
	title: 'Syllabus centraal examen Latijnse taal en cultuur vwo 2027, versie 2 (juli 2025)',
	publisher: 'College voor Toetsen en Examens (CvTE)',
	url: 'https://www.examenblad.nl/2027/vwo/documenten/syllabus-latijnse-taal-cultuur-vwo-2027',
	/** The 2028 syllabus will differ (exam author changes), so every catalogue is tied to its year. */
	examYear: 2027
} as const;

export type Ex = [text: string, nl: string, ref: string];
export function item(id: string, term: string, summary: string, extra: { examples?: Ex[]; parts?: string[]; examYear?: number; notRequired?: boolean; topic?: boolean } = {}): GrammarItem {
	const { examples, ...rest } = extra;
	return { id, term, summary, ...rest, ...(examples ? { examples: examples.map(([text, nl, ref]) => ({ text, nl, ref })) } : {}) };
}

// ---------- Deel III: literaire termen ----------

const stilistisch: GrammarSection = {
	id: 'stilistisch',
	kind: 'stilistisch',
	title: 'Stilistische middelen',
	source: 'Bijlage 3, deel III.I',
	items: [
		item('alliteratie', 'alliteratie', 'Gelijke beginmedeklinkers bij twee of meer woorden die dicht bij elkaar staan.', { examples: [['magno cum murmure montis', 'met groot gebrul van de berg', 'Vergilius, Aeneis 1.55']] }),
		item('anafora', 'anafora', 'Herhaling van een tekstelement aan het begin van opeenvolgende zinnen, zinsdelen of versregels. De herhaalde woorden hoeven niet in dezelfde vorm te staan.', { examples: [['Ille mi par esse deo videtur, ille, si fas est, superare divos', 'Hij lijkt mij gelijk aan een god, hij lijkt mij, als het mag, de goden te overtreffen', 'Catullus, Carmina 51.1-2']] }),
		item('antithese', 'antithese', 'Inhoudelijk tegengestelde begrippen staan dicht bij elkaar.', { examples: [['alieni adpetens, sui profusus', 'belust op andermans bezit, kwistig met het zijne', 'Sallustius, De coniuratione Catilinae 5']] }),
		item('asyndeton', 'asyndeton', 'Twee of meer tekstelementen volgen elkaar op zonder verbindingswoord. Een vertaler mag het verband zelf expliciet maken.', { examples: [['retia rara, plagae, lato venabula ferro', 'wijdmazige netten, strikken, speren met brede ijzeren punt', 'Vergilius, Aeneis 4.131']] }),
		item('chiasme', 'chiasme', 'Kruisgewijze plaatsing van grammaticaal of inhoudelijk gelijkwaardige tekstelementen (a b b a). Op het examen noteer je de vier elementen in die volgorde.', { examples: [['Aenean fundantem arces ac tecta novantem', 'Aeneas, die vestingen sticht en huizen vernieuwt', 'Vergilius, Aeneis 4.260-261']] }),
		item('climax', 'climax', 'Een reeks van minstens drie tekstelementen met een steeds sterkere inhoud.', { examples: [['qui de nostro omnium interitu, qui de huius urbis atque adeo de orbis terrarum exitio cogitent', 'die zinnen op de dood van ons allen, op de ondergang van deze stad, ja van de hele wereld', 'Cicero, In Catilinam 1.9']] }),
		item('eufemisme', 'eufemisme', 'Een negatief geladen begrip wordt weergegeven met een verzachtende aanduiding.', { examples: [['illuc, unde negant redire quemquam', 'daarheen, vanwaar volgens zeggen niemand terugkeert', 'Catullus, Carmina 3']] }),
		item('hypallage', 'hypallage', 'Een bijvoeglijk naamwoord congrueert met een ander zelfstandig naamwoord dan waar het qua betekenis bij hoort.', { examples: [['altae moenia Romae', 'de muren van het hoge Rome', 'Vergilius, Aeneis 1.7']] }),
		item('hyperbaton', 'hyperbaton', 'Woorden die grammaticaal bij elkaar horen staan uit elkaar, doordat er een element tussen staat dat er niet bij hoort. Bij magno cum murmure is dat niet zo: cum hoort bij de woordgroep.'),
		item('hyperbool', 'hyperbool', 'Overdrijving.', { examples: [['instar montis equum', 'een paard zo groot als een berg', 'Vergilius, Aeneis 2.15']] }),
		item('litotes', 'litotes', 'Een begrip wordt ontkend om het tegendeel te benadrukken.', { examples: [['non ignoro', 'ik weet heel goed', 'Cicero, Epistulae ad Familiares 15.6']] }),
		item('metafoor', 'metafoor', 'Een begrip wordt vervangen door een begrip waarmee het een gelijkenis heeft. Anders dan bij een vergelijking noem je alleen het beeld, zonder "als" of "zoals".', { examples: [['vulnus alit venis et caeco carpitur igne', 'zij voedt de wond met haar bloed en wordt verteerd door verborgen vuur', 'Vergilius, Aeneis 4.2']] }),
		item('metonymia', 'metonymia', 'Een begrip wordt vervangen door een begrip dat ermee te maken heeft, zonder dat er een gelijkenis is.', {
			parts: ['abstractum pro concreto', 'naam van een god voor een begrip uit zijn of haar invloedssfeer', 'materiaal voor het voorwerp zelf', 'pars pro toto (deel voor het geheel)'],
			examples: [['Cererem corruptam undis', 'Ceres (= het graan) die bedorven was door het water', 'Vergilius, Aeneis 1.177']]
		}),
		item('paradox', 'paradox', 'Een schijnbare tegenstrijdigheid.', { examples: [['Cum tacent, clamant', 'Doordat ze zwijgen, schreeuwen ze', 'Cicero, In Catilinam 1.21']] }),
		item('parallellisme', 'parallellisme', 'De onderdelen van twee of meer gelijkwaardige tekstelementen staan in dezelfde volgorde (a b a b). Op het examen noteer je de elementen in die volgorde.'),
		item('personificatie', 'personificatie', 'Levenloze dingen of abstracties worden voorgesteld als levende wezens of krijgen hun eigenschappen.', { examples: [['Silent enim leges inter arma', 'Want tussen de wapens zwijgen de wetten', 'Cicero, Pro Milone 11']] }),
		item('pleonasme', 'pleonasme', 'Aan een begrip wordt een kwalificatie toegekend die al in het begrip zelf besloten ligt.', { examples: [['deorum immortalium', 'van de onsterfelijke goden', 'Cicero, Pro Sexto Roscio 29']] }),
		item('polysyndeton', 'polysyndeton', 'Twee of meer tekstelementen in een zin zijn verbonden door evenveel nevenschikkende voegwoorden. Bij drie of meer elementen mag het voegwoord bij het eerste ontbreken.', { examples: [['Et placet et video', 'En hij bevalt mij en ik zie hem', 'Ovidius, Metamorphoses 3.446']] }),
		item('retorische-vraag', 'retorische vraag', 'Een vraag waarop de vrager geen antwoord verwacht.', { examples: [['Quo usque tandem abutere, Catilina, patientia nostra?', 'Hoe lang nog, Catilina, zul je misbruik maken van ons geduld?', 'Cicero, In Catilinam 1.1']] }),
		item('sententia', 'sententia', 'Een algemeen geldende uitspraak.', { examples: [['homines, dum docent, discunt', 'mensen leren terwijl ze onderwijzen', 'Seneca, Epistulae Morales 7.8']] }),
		item('tautologie', 'tautologie', 'Een begrip wordt nevenschikkend herhaald in andere woorden.', { examples: [['munivi atque firmavi', 'ik heb beveiligd en versterkt', 'Cicero, In Catilinam 1.10']] }),
		item('tricolon', 'tricolon', 'Een opsomming die uit drie delen bestaat.', { examples: [['castus et sanctus et diis simillimus princeps', 'een zuivere en heilige keizer die het meest op de goden lijkt', 'Plinius Minor, Panegyricus 1']] }),
		item('vergelijking', 'vergelijking', 'Een begrip wordt met een ander begrip vergeleken (met "als", "zoals", "gelijk aan"). Drie onderdelen: het afgebeelde (wat vergeleken wordt), het beeld (waarmee het vergeleken wordt) en het tertium comparationis of punt van overeenkomst (waarin ze gelijk zijn).', {
			parts: ['afgebeelde', 'beeld', 'tertium comparationis / punt van overeenkomst'],
			examples: [['visa fugit nymphe, veluti perterrita fulvum cerva lupum', 'de nimf vlucht nu ze gezien is, zoals een geschrokken hinde vlucht voor een bruine wolf', 'Ovidius, Metamorphoses 11.771-772']]
		})
	]
};

const narratologisch: GrammarSection = {
	id: 'narratologisch',
	kind: 'narratologisch',
	title: 'Narratologische middelen',
	source: 'Bijlage 3, deel III.II',
	items: [
		item('alwetende-verteller', 'alwetende verteller', 'De verteller kent alle gebeurtenissen, achtergronden en het verloop van het verhaal.'),
		item('apostrofe', 'apostrofe', 'Iemand spreekt een ding, een begrip of een personage aan dat er niet bij is. De aanspreker kan de verteller zelf zijn.', { examples: [['Quis tibi tum, Dido, cernenti talia sensus?', 'Wat voelde je toen, Dido, toen je zoiets zag?', 'Vergilius, Aeneis 4.408']] }),
		item('dramatische-ironie', 'dramatische ironie', 'Een of meer personages weten minder van de situatie dan de lezer of toehoorder.'),
		item('prospectie', 'prospectie (flashforward)', 'De verteller of een personage verwijst naar latere gebeurtenissen.'),
		item('retrospectie', 'retrospectie (flashback)', 'De verteller of een personage verwijst naar eerdere gebeurtenissen.'),
		item('ringcompositie', 'ringcompositie', 'Een tekstgedeelte wordt afgebakend doordat aan het eind een element uit het begin wordt herhaald, letterlijk of niet.'),
		item('vertelperspectief', 'vertelperspectief', 'Het gezichtspunt waarvan uit de lezer de gebeurtenissen ziet: dat van de verteller of van een personage.'),
		item('verteltempo', 'verteltempo', 'De verhouding tussen verteltijd (hoe lang het vertellen duurt) en vertelde tijd (hoe lang de gebeurtenissen duren).', { parts: ['versnelling: verteltijd korter dan vertelde tijd', 'vertraging: verteltijd langer dan vertelde tijd'] })
	]
};

const argumentatief: GrammarSection = {
	id: 'argumentatief',
	kind: 'argumentatief',
	title: 'Argumentatieve middelen',
	source: 'Bijlage 3, deel III.III',
	items: [
		item('a-fortiori', 'a-fortiori-redenering', 'Een bewering wordt verdedigd met een sterker voorbeeld: als het al geldt voor het zwaardere geval, dan zeker voor dit.'),
		item('analogie', 'analogie-redenering', 'Een bewering wordt verdedigd door een vergelijkbare situatie aan te halen.'),
		item('autoriteitsargument', 'autoriteitsargument', 'Een bewering wordt verdedigd door te verwijzen naar de mening van een belangrijk persoon of van belangrijke personen.'),
		item('fictieve-uitspraak', 'fictieve uitspraak', 'De spreker verwoordt zelf een mogelijke reactie of tegenwerping om er vooraf op in te gaan.'),
		item('syllogisme', 'syllogisme', 'Een redenering waarin uit twee premissen een conclusie volgt: een algemene (premisse maior) en een specifieke (premisse minor).', { parts: ['premisse maior', 'premisse minor', 'conclusie'] })
	]
};

const poezie: GrammarSection = {
	id: 'poezie',
	kind: 'poezie',
	title: 'Aanvullingen voor poëzie',
	source: 'Bijlage 3, deel III.IV',
	items: [
		item('metrum', 'metrum', 'Je scandeert een dactylische hexameter en een dactylische pentameter. Bekend verondersteld: dactylus, spondee, hexameter, pentameter, elegisch distichon. Cesuur en synizese worden niet bekend verondersteld.', {
			parts: ['dactylus', 'spondee', 'hexameter', 'pentameter', '(elegisch) distichon']
		}),
		item('klemtoon-lengte-1e-declinatie', 'lengte van -a in de eerste declinatie', 'Nominativus enkelvoud van de eerste declinatie eindigt op een korte -a, de ablativus enkelvoud op een lange -a. Bij onzijdige woorden eindigen nominativus en accusativus meervoud op een korte -a.'),
		item('elisie', 'elisie', 'Eindigt een woord op een klinker of -m en begint het volgende woord met een klinker of h-, dan valt de slotklinker (met de -m) weg in uitspraak en metriek.'),
		item('metrum-inhoud', 'verband tussen metrum en inhoud', 'Veel spondeeën in een regel kunnen plechtigheid, somberheid of traagheid uitdrukken; veel dactylen opwinding, luchtigheid of snelheid.'),
		item('dichterlijk-meervoud', 'dichterlijk meervoud', 'Een meervoud waar een enkelvoud bedoeld wordt.', { examples: [['nudaque marmoreis percussit pectora palmis', 'en hij sloeg met marmerwitte handen op zijn ontblote borst', 'Ovidius, Metamorphoses 3.481']] }),
		item('enjambement', 'enjambement', 'Een syntactische eenheid loopt door voorbij het einde van de versregel, met hoogstens twee woorden van die eenheid op de volgende regel.'),
		item('homerische-vergelijking', 'homerische vergelijking', 'Een vergelijking waarvan het beeld uitvoerig wordt uitgewerkt. Het beeld heeft een primaire functie (een deel van het verhaal illustreren) en vaak secundaire functies, zoals vooruit- of terugverwijzen, emoties wekken of de passage in een breder perspectief plaatsen.'),
		item('patronymicum', 'patronymicum', 'Een persoonsaanduiding afgeleid van de naam van de (groot)vader, bijvoorbeeld Tyndaris voor Helena, dochter van Tyndareüs.')
	]
};

// ---------- 2027: Cicero en de retorica (examenonderwerp van dit jaar) ----------

const retorica: GrammarSection = {
	id: 'retorica',
	kind: 'retorica',
	title: 'Retorica (examenonderwerp 2027: Cicero)',
	source: 'Hoofdstuk 2, onderdeel A.2',
	items: [
		item('genera', 'drie soorten redevoeringen', 'Naar Aristoteles: het pleidooi in de rechtszaal (is het wettig?), de politieke rede (is het nuttig of schadelijk?) en de gelegenheidsrede, lof of smaad (is het goed of slecht?).', { parts: ['genus iudiciale', 'genus deliberativum', 'genus demonstrativum'], examYear: 2027 }),
		item('taken-redenaar', 'de vijf taken van de redenaar', 'De opeenvolgende fasen van het maken van een rede, van onderwerp tot publiek: onderzoek en argumenten vinden, ordenen, verwoorden, uit het hoofd leren, voordragen.', { parts: ['inventio', 'dispositio', 'elocutio', 'memoria', 'actio'], examYear: 2027 }),
		item('delen-rede', 'de delen van de redevoering', 'De ideale opbouw van een rede: inleiding, vertelling van de toedracht, stelling met indeling, argumentatie (met weerlegging en bevestiging) en afsluiting.', { parts: ['exordium', 'narratio', 'propositio', 'argumentatio (refutatio en confirmatio)', 'peroratio'], examYear: 2027 }),
		item('overreding', 'de leer van de overreding', 'De redenaar heeft drie wapens: gunstig stemmen (vooral in het exordium), onderwijzen (narratio tot argumentatio) en ontroeren (vooral in de peroratio). Ze liggen dicht bij ethos, logos en pathos.', { parts: ['conciliare', 'docere', 'movere'], examYear: 2027 }),
		item('ethos-logos-pathos', 'ethos, logos en pathos', 'Aristoteles: overtuigen op basis van karakter, van argumenten of van emotie.', { parts: ['ethos', 'logos', 'pathos'], examYear: 2027 }),
		item('oratio-invectiva', 'oratio invectiva', 'Een rede om een tegenstander aan te vallen en onderuit te halen, door hem van allerlei lelijks te betichten. Argumenten die op de persoon gericht zijn heten argumenten ad hominem.', { examYear: 2027 }),
		item('laudatio', 'laudatio', 'De lofrede: de positieve tegenhanger van de oratio invectiva, die de goede eigenschappen van iemand benadrukt.', { examYear: 2027 }),
		item('ambten', 'Romeinse ambten', 'Deze termen worden bekend verondersteld: aedilis, volkstribuun, quaestor, praetor, consul, proconsul, censor, dictator.', { parts: ['aedilis', 'volkstribuun', 'quaestor', 'praetor', 'consul', 'proconsul', 'censor', 'dictator'], examYear: 2027 }),
		item('populares-optimates', 'populares en optimates', 'Twee politieke richtingen in de late Republiek: de populares zochten macht via het volk (de volksvergadering), de optimates wilden de macht van de senaat versterken.', { examYear: 2027 })
	]
};

// ---------- Deel I: vormleer ----------

const vormleer: GrammarSection = {
	id: 'vormleer',
	kind: 'vormleer',
	title: 'Vormleer',
	source: 'Bijlage 3, deel I',
	items: [
		item('v-zelfstandig', 'zelfstandige naamwoorden', 'Verbuiging en uitgangen van de a-, o-, medeklinker-, u- en e-stammen, met uitzonderingen en regels.', {
			parts: [
				'a-stammen',
				'o-stammen, inclusief vir en het type puer en magister',
				'medeklinkerstammen, inclusief genitivus op -ium en de verbuiging van mare',
				'u-stammen, exclusief het onzijdige',
				'e-stammen',
				'de verbuiging van vis, Iuppiter en domus',
				'de locativi domi en Romae',
				'geslachtsregels van a-, o-, u- en e-stammen, inclusief de uitzonderingen manus en domus',
				'medeklinkerstammen: mannelijk op -or, vrouwelijk op -tas, -io en -x, onzijdig op -us en -men',
				'de vocativus, inclusief het type fili'
			]
		}),
		item('v-bijvoeglijk', 'bijvoeglijke naamwoorden', 'Verbuiging, vergrotende en overtreffende trap.', {
			parts: [
				'o-/a-stammen, inclusief het type pulcher en miser',
				'medeklinkerstammen met drie, twee en één uitgang',
				'vergrotende trap op -ior en -ius (vorming en verbuiging)',
				'overtreffende trap op -issimus, -errimus en -illimus (vorming en verbuiging)',
				'trappen van bonus, malus, magnus, parvus en multus'
			]
		}),
		item('v-bijwoorden', 'bijwoorden', 'Vorming van het bijwoord en de trappen.', { parts: ['vorming op -e en -(i)ter', 'vergrotende trap op -ius', 'overtreffende trap op -e'] }),
		item('v-telwoorden', 'telwoorden', 'De verbuiging van unus, duo en tres.', { parts: ['unus', 'duo', 'tres'] }),
		item('v-voornaamwoorden', 'voornaamwoorden', 'De verbuiging van alle voornaamwoorden, behalve de genitivus obiectivus mei, tui, nostri en vestri.'),
		item('v-werkwoord-stammen', 'werkwoorden: stammen en systemen', 'Vervoeging van alle stamtypes in actief, passief en (semi)deponens, in indicativus en coniunctivus.', {
			parts: ['a-stammen', 'e-stammen', 'i-stammen', 'medeklinkerstammen', 'gemengde stammen', 'actief, passief en (semi)deponens', 'indicativus en coniunctivus']
		}),
		item('v-tijden', 'werkwoorden: tijden en imperativus', 'Zes tijden en de imperativus van de tweede persoon (zonder imperativus futuri, zonder passieve imperativus, dus ook niet van deponentia).', {
			parts: ['praesens', 'imperfectum', 'futurum', 'perfectum', 'plusquamperfectum', 'futurum exactum', 'imperativus 2e persoon']
		}),
		item('v-nominale-vormen', 'infinitivus, participium, gerundium en gerundivum', 'Welke nominale vormen je kent.', {
			parts: [
				'infinitivus: praesens actief, praesens passief, futurum actief, perfectum actief, perfectum passief',
				'participium: praesens actief, futurum actief, perfectum passief',
				'gerundium',
				'gerundivum'
			]
		}),
		item('v-onregelmatig', 'onregelmatige werkwoorden', 'Vervoeging inclusief stamtijden.', {
			parts: ['velle, nolle', 'esse, posse, fieri', 'ire en ferre, inclusief samenstellingen met voorzetsels', 'de onvolledige werkwoorden memini en odi', 'de semi-deponentia audere en solere', 'de vormen inquit en ait']
		}),
		item('v-perfectum', 'perfectum actief: soorten', 'Typen van de perfectumvorming.', { parts: ['-vi', '-ui', '-i, -si, -xi, -psi', 'uitgang -ēre in plaats van -ērunt', 'klankverandering', 'reduplicatie'] }),
		item('v-ppp', 'participium perfectum passief: uitgangen', 'Het participium perfectum passief eindigt op -tus of -sus.', { parts: ['-tus', '-sus'] }),
		item('v-verkort', 'verkorte perfectumvormen', 'Perfectum en plusquamperfectum kennen verkorte vormen waarbij -vi of -ve achter de stam ontbreekt.')
	]
};

// ---------- Deel II: syntaxis ----------

const syntaxis: GrammarSection = {
	id: 'syntaxis',
	kind: 'syntaxis',
	title: 'Syntaxis',
	source: 'Bijlage 3, deel II',
	items: [
		item('s-congruentie', 'congruentie', 'Het begrip congruentie (congrueren met) en de regels ervoor.', {
			parts: ['onderwerp en persoonsvorm', 'onderwerp en naamwoordelijk deel van het gezegde', 'bijstelling', 'bijvoeglijk en zelfstandig naamwoord', 'voornaamwoord en zelfstandig naamwoord', 'antecedent en betrekkelijk voornaamwoord', 'bijvoeglijke bepaling', 'predicatieve bepaling']
		}),
		item('s-nominativus', 'nominativus', 'Functies van de nominativus.', { parts: ['onderwerp (subject)', 'naamwoordelijk deel van het gezegde'] }),
		item('s-genitivus', 'genitivus', 'Functies van de genitivus.', {
			parts: ['bijvoeglijke bepaling: genitivus possessivus, partitivus, subiectivus en obiectivus', 'aanvulling bij werkwoorden', 'aanvulling bij bijvoeglijke naamwoorden', 'causa met genitivus']
		}),
		item('s-dativus', 'dativus', 'Functies van de dativus.', {
			parts: ['meewerkend voorwerp', 'de handelende persoon bij het gerundivum', 'de bezitter bij het werkwoord esse', 'aanvulling bij bijvoeglijke naamwoorden', 'aanvulling bij werkwoorden']
		}),
		item('s-accusativus', 'accusativus', 'Functies van de accusativus.', {
			parts: ['lijdend voorwerp (object)', 'bijwoordelijke bepaling van tijdsduur en afstand', 'accusativi van richting: Romam en domum', 'aanvulling bij werkwoorden, bijvoorbeeld de dubbele accusativus', 'onderwerp en naamwoordelijk deel van het gezegde in de a.c.i.', 'accusativus respectus', 'na voorzetsels']
		}),
		item('s-ablativus', 'ablativus', 'Functies van de ablativus.', {
			parts: ['bijwoordelijke bepaling van plaats, tijd, middel, reden, wijze, maat, verwijdering en vergelijking', 'aanvulling bij werkwoorden', 'aanvulling bij bijvoeglijke naamwoorden', 'ablativus absolutus', 'na voorzetsels']
		}),
		item('s-vocativus', 'vocativus', 'De aanspreekvorm.'),
		item('s-voorzetsels', 'voorzetsels', 'Het gebruik van de naamvallen bij voorzetsels.', { topic: true }),
		item('s-bijvoeglijk', 'bijvoeglijke naamwoorden: gebruik', 'Bijvoeglijk en zelfstandig gebruikt.', { topic: true }),
		item('s-trappen', 'trappen van vergelijking: gebruik', 'Gebruik en betekenis van de vergrotende en overtreffende trap.', {
			parts: ['vergrotende trap, ook met de betekenissen "tamelijk" en "te"', 'quam of ablativus van vergelijking na een vergrotende trap', 'overtreffende trap: "-ste" en "zeer"', 'quam met een overtreffende trap: "zo ... mogelijk"']
		}),
		item('s-voornaamwoorden', 'voornaamwoorden: gebruik', 'Gebruik en bijzondere constructies.', { parts: ['bijvoeglijk en zelfstandig gebruik', 'het (ingesloten) antecedent van een betrekkelijke bijzin', 'de relatieve aansluiting'] }),
		item('s-werkwoord-begrippen', 'werkwoorden: begrippen', 'Begrippen die je moet kunnen gebruiken.', { parts: ['overgankelijk (transitief) en onovergankelijk (intransitief)', 'directe en indirecte rede', '(semi)deponens'] }),
		item('s-tijden', 'gebruik van de tijden', 'Kernbetekenis en gebruik van praesens, imperfectum en perfectum.', {
			parts: [
				'praesens: gelijktijdig aan het heden, ook praesens historicum in een verhaal over het verleden',
				'imperfectum: gelijktijdig aan een moment of periode in het verleden; voortdurende situatie, poging, achtergrond, gewoonte',
				'perfectum: voortijdig aan het heden; in een verhaal een gebeurtenis'
			]
		}),
		item('s-coniunctivus', 'gebruik van de coniunctivus', 'Waar de coniunctivus voor dient.', {
			parts: [
				'hoofdzinnen: aansporing, verbod (coniunctivus praesens en perfectum), twijfel (dubitativus van heden en verleden), vervulbare en onvervulbare wens, mogelijkheid (potentialis van heden en verleden), irrealis van heden en verleden',
				'conditionele bijzinnen: mogelijkheid, irrealis van heden en verleden',
				'betrekkelijke bijzinnen: finaal, causaal en consecutief/definiërend',
				'indirecte vraag',
				'na de voegwoorden cum, ut en ne',
				'bijzinnen van de indirecte rede'
			]
		}),
		item('s-quia-quod', 'coniunctivus bij quia en quod (subjectieve reden)', 'De coniunctivus in causale bijzinnen met quia en quod (subjectieve reden) wordt niet bekend verondersteld.', { notRequired: true }),
		item('s-infinitivus', 'infinitivus: gebruik', 'Gelijktijdigheid, voortijdigheid en natijdigheid, en de infinitivus in de a.c.i. en n.c.i.', { parts: ['gelijktijdig, voortijdig, natijdig', 'a.c.i.', 'n.c.i.'] }),
		item('s-participium', 'participium: gebruik', 'Gelijktijdig, voortijdig en natijdig, en de gebruiksmogelijkheden.', {
			parts: ['bijvoeglijk, zelfstandig en predicatief gebruikt', 'ablativus absolutus', 'participium futurum actief met doelaangevende betekenis', 'participium futurum actief met esse: omschrijvend futurum (coniugatio periphrastica)', 'het dominant gebruik van het participium']
		}),
		item('s-gerundium-gerundivum', 'gerundium en gerundivum: gebruik', 'Gebruik van de gerundiumvormen en van het gerundivum.', {
			parts: ['het gerundium', 'gerundivum als naamwoordelijk deel van het gezegde: gerundivum van verplichting, inclusief "kunnen" en "mogen" bij ontkenningen', 'het dominant gebruik van het gerundivum: de gerundivumconstructie']
		}),
		item('s-vraagzinnen', 'vraagzinnen', 'Directe en indirecte vragen, inclusief de vraagpartikels.', { parts: ['num', 'nonne', '-ne', 'utrum / -ne ... an'] })
	]
};

export const LTC_2027_SECTIONS: readonly GrammarSection[] = [vormleer, syntaxis, stilistisch, narratologisch, argumentatief, poezie, retorica];

export const LTC_2027: GrammarCatalogue = { id: 'ltc-2027', subject: 'Latijn', examYear: 2027, source: LTC_2027_SOURCE, sections: LTC_2027_SECTIONS };

export function allItems(sections: readonly GrammarSection[] = LTC_2027_SECTIONS): { section: GrammarSection; item: GrammarItem }[] {
	return sections.flatMap((section) => section.items.map((it) => ({ section, item: it })));
}
