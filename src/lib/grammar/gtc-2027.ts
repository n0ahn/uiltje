// What a Greek student must know for the centraal examen Griekse taal en cultuur vwo 2027: the CvTE "minimumlijst"
// (vormleer, syntaxis, literaire termen), the Ionic of Herodotus (exam topic 2027) and the additions per author.
// Summaries are our own wording; the syllabus is the authority. The literary terms are the same as for Latin
// (same CvTE list), so those items are reused from the Latin catalogue with Greek examples.
import { LTC_2027_SECTIONS, item } from './ltc-2027';
import type { GrammarCatalogue, GrammarItem, GrammarSection } from './types';

export const GTC_2027_SOURCE = {
	title: 'Syllabus centraal examen Griekse taal en cultuur vwo 2027, versie 4 (april 2026)',
	publisher: 'College voor Toetsen en Examens (CvTE)',
	url: 'https://www.examenblad.nl/2027/vwo/documenten/syllabus-griekse-taal-cultuur-vwo-2027'
} as const;

type Override = Partial<Omit<GrammarItem, 'id'>>;

/** Takes a literary-terms section of the Latin catalogue, drops the Latin examples and applies Greek ones. */
function shared(sectionId: string, kindTitle: string, overrides: Record<string, Override>): GrammarSection {
	const base = LTC_2027_SECTIONS.find((s) => s.id === sectionId);
	if (!base) throw new Error(`Latin section ${sectionId} not found`);
	return {
		...base,
		title: kindTitle,
		items: base.items.map((it) => {
			const { examples: _latin, ...rest } = it;
			return { ...rest, ...overrides[it.id] };
		})
	};
}

const ex = (text: string, nl: string, ref: string) => ({ text, nl, ref });

// ---------- Deel III: literaire termen ----------

const stilistisch = shared('stilistisch', 'Stilistische middelen', {
	alliteratie: { examples: [ex('Καὶ σύ τοι παίδων πατὴρ πέφυκας', 'Ook jij bent immers een vader van kinderen', 'Euripides, Medea 344-345')] },
	anafora: { examples: [ex('ἐκεῖνος εἶναί φησι Διόνυσον θεόν, ἐκεῖνος ἐν μηρῷ ποτ’ ἐρράφθαι Διός', 'hij zegt dat Dionysus een god is, hij zegt dat hij ooit in de dij van Zeus is genaaid', 'Euripides, Bacchae 243-244')] },
	antithese: { examples: [ex('Ἰὼ στέγαι φίλων ἐρῆμοι, τῶν δ’ ἀπολλύντων πλέαι', 'Ach, huizen verlaten door vrienden, maar vol van moordenaars', 'Sophocles, Electra 1404-1405')] },
	asyndeton: { examples: [ex('Ἀκηκόατε, ἑοράκατε, πεπόνθατε, ἔχετε· δικάζετε', 'U hebt gehoord, gezien, geleden; u hebt hem hier: spreek recht', 'Lysias 12.100')] },
	chiasme: { examples: [ex('βαρεῖαν ἐχθροῖς καὶ φίλοισιν εὐμενῆ', 'zwaar voor vijanden en voor vrienden welgezind', 'Euripides, Medea 809')] },
	climax: { examples: [ex('καὶ κύσε χεῖρας, δεινάς, ἀνδροφόνους, αἵ οἱ πολέας κτάνον υἷας', 'en hij kuste de handen, de geduchte, mannendodende, die veel zonen van hem hadden gedood', 'Homerus, Ilias 24.478-479')] },
	eufemisme: { examples: [ex('Ὑμεῖς δὲ μητέρ’ οὐκέτ’ ὄμμασιν φίλοις ὄψεσθ’, ἐς ἄλλο σχῆμ’ ἀποστάντες βίου', 'Jullie zullen jullie moeder niet meer met lieve ogen zien, nu jullie zijn overgegaan naar een andere levensvorm', 'Euripides, Medea 1038-1039')] },
	sententia: {
		term: 'γνώμη / sententia',
		examples: [ex('Κἀν βροτοῖς αἱ δεύτεραί πως φροντίδες σοφώτεραι', 'Ook bij mensen zijn de tweede gedachten meestal wijzer', 'Euripides, Hippolytus 435-436')]
	},
	hypallage: { examples: [ex('νεῖκος ἀνδρῶν ξύναιμον', 'een verwante ruzie van mannen (= een ruzie tussen verwante mannen)', 'voorbeeld in de syllabus, zonder bronvermelding')] },
	hyperbaton: {
		summary: 'Tussen woorden die grammaticaal bij elkaar horen staan een of meer woorden die er niet bij horen. In ὃν κατὰ θυμόν is dat niet zo: het voorzetsel κατά maakt deel uit van de woordgroep.',
		examples: [ex('οὔκ, ἀλλὰ Πενθέως ἡ τάλαιν’ ἔχω κάρα', 'Nee, maar ik, ongelukkige, heb het hoofd van Pentheus vast', 'Euripides, Bacchae 1284')]
	},
	litotes: { examples: [ex('ποιέων τε ταῦτα ἔπαινον εἶχε οὐκ ὀλίγον πρὸς τῶν πολιητέων', 'en door dit te doen verwierf hij niet weinig lof bij zijn medeburgers', 'Herodotus, Historiae 1.96')] },
	metafoor: { examples: [ex('ἐς δὲ τὴν τύχην πεσοῦσ’ ὅσην σὺ πῶς ἂν ἐκνεῦσαι δοκεῖς;', 'hoe denk je uit zo’n groot ongeluk, waarin je bent terechtgekomen, te kunnen wegzwemmen (= ontsnappen)?', 'Euripides, Hippolytus 469-470')] },
	metonymia: {
		examples: [
			ex('σπλάγχνα δ’ ἄρ’ ἀμπείραντες ὑπείρεχον Ἡφαίστοιο', 'nadat ze de ingewanden aan het spit hadden geregen, hielden ze die boven Hephaestus (= het vuur)', 'Homerus, Ilias 2.426'),
			ex('μή τις χαλκὸν ἐνὶ στήθεσσι βαλὼν ἐκ θυμὸν ἕλοιτο', 'dat niemand hem het leven zou nemen door brons (= een wapen) in zijn borst te stoten', 'Homerus, Ilias 5.316-317')
		]
	},
	paradox: { examples: [ex('Τεθνᾶσι κοὐ τεθνᾶσι', 'Ze zijn dood en toch niet dood', 'Euripides, Helena 138')] },
	personificatie: { examples: [ex('μῆλα, τὰ δὴ κατέκειτ’ ἐσφαγμένα νηλέϊ χαλκῷ', 'schapen die daar lagen, geslacht door het meedogenloze brons', 'Homerus, Odyssee 11.45')] },
	pleonasme: { examples: [ex('περιναιέται ἀμφὶς ἐόντες', 'omwonenden die rondom wonen', 'Homerus, Ilias 24.488')] },
	polysyndeton: { examples: [ex('ἠέ τινα τριπόδων εὐχάλκων ἠὲ λεβήτων, ἠὲ δύ’ ἡμιόνους ἠὲ χρύσειον ἄλεισον', 'een van de mooie bronzen drievoeten of ketels, of twee muilezels, of een gouden beker', 'Homerus, Odyssee 15.84-85')] },
	'retorische-vraag': { examples: [ex('Κακῶς πέπρακται πανταχῇ· τίς ἀντερεῖ;', 'Het staat er overal slecht voor; wie zal dit tegenspreken?', 'Euripides, Medea 364')] },
	tautologie: { examples: [ex('τὰς γὰρ ἐνθάδε θυσίας ἐπιστάμεσθα καὶ γιγνώσκομεν', 'want wij kennen de offers hier en zijn ervan op de hoogte', 'Euripides, Iphigeneia bij de Tauriërs 490-491')] },
	tricolon: { examples: [ex('Αἱρεῖ γὰρ ἀνδρῶν ὄμματ’, ἐξαιρεῖ πόλεις, πίμπρησιν οἴκους', 'Zij verovert de ogen van mannen, verwoest steden, steekt huizen in brand', 'Euripides, Troades 892-893')] },
	vergelijking: { examples: [ex('οἳ δὲ λύκοι ὣς ἀλλήλοις ἐπόρουσαν', 'en zij stormden als wolven op elkaar af', 'Homerus, Ilias 4.471-472')] }
});

const narratologisch = shared('narratologisch', 'Narratologische middelen', {
	apostrofe: { examples: [ex('Ἔνθ’ ἄρα τοι, Πάτροκλε, φάνη βιότοιο τελευτή', 'Toen verscheen voor jou, Patroclus, het einde van je leven', 'Homerus, Ilias 16.787')] },
	'dramatische-ironie': { summary: 'Een of meer personages weten minder van de situatie dan de lezer of toehoorder. Voorbeeld in de syllabus: Oedipus belooft de moordenaar van zijn vader te vinden, zonder te weten dat hij het zelf is (Sophocles, Oedipus Tyrannus 264-266).' },
	prospectie: { examples: [ex('χρῆν γὰρ Κανδαύλῃ γενέσθαι κακῶς', 'want het moest slecht aflopen met Candaules', 'Herodotus, Historiën 1.8')] },
	retrospectie: { examples: [ex('Οὐ μὲν δὴ τόδε μεῖζον ἔπι κακὸν ἢ ὅτε Κύκλωψ εἴλει ἐνὶ σπῆι γλαφυρῷ κρατερῆφι βίηφιν', 'Dit is toch geen groter onheil dan toen de Cycloop ons met zijn sterke kracht opsloot in zijn holle grot', 'Homerus, Odyssee 12.209-210')] },
	ringcompositie: { examples: [ex('Ἄνδρα μοι ἔννεπε, Μοῦσα (…) θεά, θύγατερ Διός, εἰπὲ καὶ ἡμῖν', 'Muze, bezing mij de man (…) godin, dochter van Zeus, vertel het ook ons', 'Homerus, Odyssee 1.1 en 1.10')] }
});

const argumentatief = shared('argumentatief', 'Argumentatieve middelen', {});

// ---------- Aanvullingen per auteur (deel III.IV) ----------

const herodotus: GrammarSection = {
	id: 'herodotus-stijl',
	kind: 'auteur',
	title: 'Aanvullingen voor Herodotus',
	source: 'Bijlage 3, deel III.IV (Herodotus)',
	items: [
		item('epanalepsis', 'epanalepsis', 'Na een uitweiding (digressie) pakt de verteller het hoofdverhaal weer op door (een deel van) het voorafgaande, al dan niet letterlijk, te herhalen.', { examYear: 2027 }),
		item('kop-staartconstructie', 'kop-staartconstructie', 'Aan het begin van een zin (kop) wordt een werkwoord uit het einde van de vorige zin (staart) herhaald als participium.', {
			examples: [['Οὗτος δὴ ὦν ὁ Κανδαύλης ἠράσθη τῆς ἑωυτοῦ γυναικός, ἐρασθεὶς δέ ἐνόμιζέ οἱ εἶναι γυναῖκα πολλὸν πασέων καλλίστην', 'Deze Candaules werd verliefd op zijn eigen vrouw, en omdat hij verliefd geworden was, vond hij zijn vrouw verreweg de mooiste van alle', 'Herodotus, Historiën 1.8']],
			examYear: 2027
		})
	]
};

const homerus: GrammarSection = {
	id: 'homerus',
	kind: 'auteur',
	title: 'Aanvullingen voor Homerus',
	source: 'Bijlage 3, deel III.IV (Homerus)',
	items: [
		item('h-dichterlijk-meervoud', 'dichterlijk meervoud', 'Een meervoud waar een enkelvoud bedoeld wordt.', { examples: [['ὣς ἔφατ’, ἐν στήθεσσι καθαπτόμενος φίλον ἦτορ', 'zo sprak hij, terwijl hij zijn hart in zijn borst tot de orde riep', 'Homerus, Odyssee 20.22']] }),
		item('h-enjambement', 'enjambement', 'Een syntactische eenheid loopt door voorbij het einde van de versregel, met hoogstens twee woorden van die eenheid op de volgende regel.', { examples: [['Ἄνδρα μοι ἔννεπε, Μοῦσα, πολύτροπον, ὃς μάλα πολλὰ πλάγχθη', 'Bezing mij, Muze, de listige man die zeer veel zwierf', 'Homerus, Odyssee 1.1-2']] }),
		item('h-homerische-vergelijking', 'homerische vergelijking', 'Een vergelijking waarvan het beeld uitvoerig wordt uitgewerkt. Het beeld heeft een primaire functie (een deel van het verhaal illustreren) en vaak secundaire functies, zoals vooruit- of terugverwijzen, emoties wekken of de passage in een breder perspectief plaatsen.'),
		item('h-patronymicum', 'patronymicum', 'Een persoonsaanduiding afgeleid van de naam van de (groot)vader.', { examples: [['Ἀτρεΐδης', 'zoon van Atreus (= Agamemnon)', 'Homerus, Ilias 1.7']] }),
		item('epitheton-ornans', 'epitheton ornans', 'Een steeds terugkerende bijvoeglijke bepaling die een vaste eigenschap van een persoon of zaak weergeeft, ongeacht of die op dat moment van belang is.', { examples: [['ποδάρκης δῖος Ἀχιλλεύς', 'de snelvoetige, edele Achilles', 'Homerus, Ilias 1.121']] }),
		item('formule', 'formule', 'Een steeds terugkerende vaste formulering. Ook de combinatie van een eigennaam en een epitheton ornans is een formule. Voorbeeld: "hem antwoordde daarna …", dat ruim zeventig keer voorkomt.', { examples: [['Τὸν δ’ ἠμείβετ’ ἔπειτα ποδάρκης δῖος Ἀχιλλεύς', 'Hem antwoordde daarna de snelvoetige, edele Achilles', 'Homerus, Ilias 1.121']] }),
		item('typische-scene', 'typische scène', 'Een groep van (bijna) woordelijk herhaalde verzen waarmee een steeds terugkerende handeling wordt beschreven, zoals een aankomst, een badscène, een offer, een maaltijd of het zich bewapenen van een held.'),
		item('h-metrum', 'metrum (dactylische hexameter)', 'Je scandeert een dactylische hexameter. Bekend verondersteld: dactylus, spondee, hexameter, elisie. Cesuur en synizese worden niet bekend verondersteld.', { parts: ['dactylus', 'spondee', 'hexameter', 'elisie'] }),
		item('h-metrum-inhoud', 'verband tussen metrum en inhoud', 'Veel spondeeën in een regel kunnen plechtigheid, somberheid of traagheid uitdrukken; veel dactylen opwinding, luchtigheid of snelheid.', {
			examples: [
				['ψυχὴν κικλήσκων Πατροκλῆος δειλοῖο', 'terwijl hij de schim van de ongelukkige Patroclus aanriep (veel spondeeën)', 'Homerus, Ilias 23.221'],
				['Αὖτις ἔπειτα πέδονδε κυλίνδετο λᾶας ἀναιδής', 'Daarna rolde de schaamteloze steen weer naar de vlakte (veel dactylen)', 'Homerus, Odyssee 11.598']
			]
		})
	]
};

const tragedie: GrammarSection = {
	id: 'tragedie',
	kind: 'auteur',
	title: 'Aanvullingen voor de tragedie',
	source: 'Bijlage 3, deel III.IV (tragedie)',
	items: [
		item('t-dichterlijk-meervoud', 'dichterlijk meervoud', 'Een meervoud waar een enkelvoud bedoeld wordt.', { examples: [['ἀναίνεται δὲ λέκτρα κοὐ ψαύει γάμων', 'hij wijst het bed af en raakt het huwelijk niet aan', 'Euripides, Hippolytus 14']] }),
		item('t-enjambement', 'enjambement', 'Een syntactische eenheid loopt door voorbij het einde van de versregel, met hoogstens twee woorden van die eenheid op de volgende regel.', { examples: [['Ὡς δὲ πέτρος ἢ θαλάσσιος κλύδων ἀκούει νουθετουμένη φίλων', 'Als een rots of een golf van de zee luistert zij, terwijl vrienden haar terechtwijzen', 'Euripides, Medea 28-29']] }),
		item('t-patronymicum', 'patronymicum', 'Een persoonsaanduiding afgeleid van de naam van de (groot)vader.', { examples: [['ἡ γὰρ πανώλης Τυνδαρίς, μήτηρ ἐμή', 'want de heel verderfelijke dochter van Tyndareüs (= Clytaemestra), mijn moeder', 'Euripides, Electra 60']] }),
		item('stichomythie', 'stichomythie', 'Een dialoog waarin de sprekers om de beurt één versregel zeggen.', { examples: [['ΔΙ. Ἱερὸς ὁ πλόκαμος· τῷ θεῷ δ’ αὐτὸν τρέφω. ΠΕ. Ἔπειτα θύρσον τόνδε παράδος ἐκ χεροῖν.', 'DI. Mijn haar is heilig; ik laat het groeien voor de god. PE. Geef daarna die thyrsusstaf uit je handen.', 'Euripides, Bacchae 494-495']] })
	]
};

// ---------- Ionisch (Herodotus, examenonderwerp 2027) ----------

const ionisch: GrammarSection = {
	id: 'ionisch',
	kind: 'ionisch',
	title: 'Ionisch bij Herodotus (examenonderwerp 2027)',
	source: 'Hoofdstuk 2, onderdeel A.3 (Taal)',
	items: [
		item('i-klinkers', 'Ionisch: klinkers en aspiratie', 'Het Ionisch heeft η waar het Attisch een lange α heeft, ook na ρ, ι en ε. De aspiratie blijft vaak achterwege (psilosis).', {
			parts: ['πρῆγμα (Attisch πρᾶγμα); Ἀσίην (Attisch Ἀσίαν)', 'ἀπικνέονται (Attisch ἀφικνοῦνται)'],
			examYear: 2027
		}),
		item('i-contractie', 'Ionisch: contractie', 'Contractie van εα, εε, εει, εη, εο, εω en αο blijft meestal achterwege. εο trekt soms samen tot ευ.', {
			parts: ['καλέει (Attisch καλεῖ)', 'ἐδέξαο (Attisch ἐδέξω)', 'ἕπεο (Attisch ἕπου)', 'ἐμεῦ (Attisch ἐμοῦ)'],
			examYear: 2027
		}),
		item('i-medeklinkers', 'Ionisch: medeklinkers', 'Het Ionisch heeft soms κ waar het Attisch π heeft, en -σσ- waar het Attisch -ττ- heeft.', {
			parts: ['κῃ, κοῦ (Attisch πῃ, ποῦ)', 'θάλασσα (Attisch θάλαττα)', 'ἀπαλλάσσεο (Attisch ἀπαλλάττου)'],
			examYear: 2027
		}),
		item('i-kleine-woorden', 'Ionisch: lidwoord en kleine woorden', 'De dativus meervoud van het lidwoord is τοῖσι/τῇσι (Attisch τοῖς/ταῖς). Verder ὦν = οὖν en ἐς = εἰς.', { parts: ['τοῖσι / τῇσι', 'ὦν = οὖν', 'ἐς = εἰς'], examYear: 2027 }),
		item('i-werkwoorden', 'Ionisch: werkwoorden', 'Het augment blijft vaak achterwege. Het participium van εἰμί is ἐών, ἐόντος enz. Het Ionisch heeft γίνομαι en γινώσκω (Attisch γίγνομαι en γιγνώσκω).', {
			parts: ['ἀμείβετο (Attisch ἠμείβετο)', 'ἐών, ἐόντος (Attisch ὤν, ὄντος)', 'γίνομαι, γινώσκω'],
			examYear: 2027
		}),
		item('i-a-declinatie', 'Ionisch: a-declinatie', 'Genitivus meervoud op -έων, dativus meervoud op -ῃσι. Mannelijke eigennamen en zelfstandige naamwoorden op -ης hebben de genitivus enkelvoud op -εω.', {
			parts: ['gen. mv. -έων (Attisch -ῶν)', 'dat. mv. -ῃσι (Attisch -αις)', 'gen. ev. op -εω: Ξερξέω (Attisch Ξέρξου), ποιητέω (Attisch ποιητοῦ)'],
			examYear: 2027
		}),
		item('i-o-declinatie', 'Ionisch: o-declinatie', 'Dativus meervoud op -οισι.', { parts: ['dat. mv. -οισι (Attisch -οις)'], examYear: 2027 }),
		item('i-derde-declinatie', 'Ionisch: derde declinatie', 'Woorden op -εύς hebben de genitivus enkelvoud op -έος; woorden op -ης op -εος. Alle vormen van ι-stammen behouden de iota. De nominativus en accusativus meervoud van onzijdige woorden op -ος is -εα.', {
			parts: ['βασιλέος (Attisch βασιλέως)', 'Ἀνδροκράτεος (Attisch Ἀνδροκράτους)', 'πόλιος, πόλι, πολίες, πολίων, πόλισι, πόλιας (Attisch πολέως, πόλει, πόλεις, πόλεων, πόλεσι, πόλεις)', 'ὀνείδεα (Attisch ὀνείδη)', 'πολλός, πολλόν (Attisch πολύς, πολύν/πολύ)'],
			examYear: 2027
		}),
		item('i-voornaamwoorden', 'Ionisch: voornaamwoorden', 'Betrekkelijke voornaamwoorden hebben meestal een τ-vorm (gelijk aan het lidwoord), behalve in de nominativus van mannelijk en vrouwelijk (ὅς, οἵ, ἥ, αἵ). Daarnaast een aantal persoonlijke en wederkerende vormen.', {
			parts: ['ἡμέων, ἡμέας (Attisch ἡμῶν, ἡμᾶς)', 'ὑμέων, ὑμέας (Attisch ὑμῶν, ὑμᾶς)', 'ἑωυτ- (Attisch ἑαυτ-)', 'οἱ = αὐτῷ / αὐτῇ', 'μιν = αὐτόν / αὐτήν / αὐτό', 'σφι = αὐτοῖς / αὐταῖς'],
			examYear: 2027
		}),
		item('i-voegwoorden', 'Ionisch: voegwoorden', 'Enkele afwijkende voegwoorden.', { parts: ['ἤν = ἐάν', 'ἐπείτε = ἐπεί', 'ὡς (ἄν) + coniunctivus/optativus: "opdat" (Attisch ὅπως)'], examYear: 2027 })
	]
};

// ---------- 2027: Herodotus en zijn context ----------

const context: GrammarSection = {
	id: 'herodotus-context',
	kind: 'context',
	title: 'Herodotus: methode en thema’s (examenonderwerp 2027)',
	source: 'Hoofdstuk 2, onderdelen A.2 en B',
	items: [
		item('historie-methode', 'ἱστορίη en de drie instrumenten', 'Herodotus onderzoekt (ἱστορίη) met drie instrumenten: zelf zien (ὄψις), horen van anderen (ἀκοή) en redeneren (γνώμη). Ontbreken bronnen of zijn er meerdere versies, dan reconstrueert hij door logisch te redeneren.', { parts: ['ὄψις (zien)', 'ἀκοή (horen)', 'γνώμη (redeneren)'], examYear: 2027 }),
		item('hybris-phthonos', 'ὕβρις en φθόνος', 'Wie zijn menselijke maat vergeet en in geluk arrogant wordt, pleegt ὕβρις. Dat wekt de afgunst (φθόνος) van de goden, die tot straf leidt.', { parts: ['ὕβρις', 'φθόνος'], examYear: 2027 }),
		item('god-algemeen', 'ὁ θεός en τὸ θεῖον', 'Als Herodotus zich zelf over religie uitspreekt, gebruikt hij meestal algemene termen: de godheid (ὁ θεός) of het goddelijke (τὸ θεῖον).', { parts: ['ὁ θεός', 'τὸ θεῖον'], examYear: 2027 }),
		item('logografen', 'logografen', 'Voorgangers van Herodotus (letterlijk "prozaschrijvers") die over genealogie, etnografie, mythografie, geografie of regionale geschiedenis schreven. Alleen fragmenten zijn bewaard. Herodotus voegt die gebieden samen in één geschiedwerk en zoekt ook de oorzaken.', { examYear: 2027 }),
		item('perzische-oorlogen', 'de Perzische oorlogen: kerndata', 'Ionische opstand 499-494 v.Chr.; eerste expeditie 492 (Macedonië onderworpen); Marathon 490; derde expeditie 480-479 met Thermopylae en Salamis (480) en Plataeae (479).', { examYear: 2027 }),
		item('polis-tiran', 'polis en tiran', 'Een polis is een klein gebied waarvan de inwoners zich autonoom voelen. Tirannen (alleenheersers) grepen in de zevende en zesde eeuw v.Chr. vaak via een staatsgreep de macht.', { examYear: 2027 })
	]
};

// ---------- Deel I: vormleer ----------

const vormleer: GrammarSection = {
	id: 'vormleer',
	kind: 'vormleer',
	title: 'Vormleer',
	source: 'Bijlage 3, deel I',
	items: [
		item('v-algemeen', 'uitgangspunt van de vormleer', 'Het uitgangspunt is het Attisch van de klassieke periode. Dualisvormen bij naamwoorden en werkwoorden worden niet bekend verondersteld.'),
		item('v-lidwoord', 'lidwoord', 'De vormen van het lidwoord.'),
		item('v-zelfstandig', 'zelfstandige naamwoorden', 'Verbuiging en uitgangen, inclusief de vocativus.', {
			parts: ['de α/η-stammen', 'de ο-stammen; van de contracta alleen νοῦς (niet ὀστοῦν)', 'de medeklinkerstammen, inclusief de stammen op -ι, -υ, -ευ, inclusief Ζεύς en ναῦς']
		}),
		item('v-zelfstandig-niet', 'zelfstandige naamwoorden: niet vereist', 'Niet bekend verondersteld: de onzijdige woorden op -ας zoals τὸ κρέας, ἡ αἰδώς en onregelmatige vocativi zoals γύναι.', { notRequired: true, parts: ['τὸ κρέας (onzijdig op -ας)', 'ἡ αἰδώς', 'γύναι'] }),
		item('v-bijvoeglijk', 'bijvoeglijke naamwoorden', 'Verbuiging, vergrotende en overtreffende trap.', {
			parts: [
				'de α/ο-stammen, inclusief de adiectiva van twee uitgangen, exclusief de adiectiva op -οῦς',
				'de medeklinkerstammen, inclusief μέγας en πολύς, het type ταχύς en het type ἀληθής (niet de contractie in -α, zoals ὑγιᾶ)',
				'vergrotende trap: ἥττων, κρείττων, βελτίων, ἀμείνων, μείζων, πλείων, κακίων, καλλίων',
				'overtreffende trap: κράτιστος, βέλτιστος, ἄριστος, μέγιστος, πλεῖστος, κάκιστος, κάλλιστος',
				'van de vergrotende trap op -(ι)ων/-(ι)ον alleen de ongecontraheerde vormen'
			]
		}),
		item('v-bijwoorden', 'bijwoorden', 'Vorming, inclusief de trappen.', { parts: ['μάλα, μᾶλλον, μάλιστα, ἥκιστα', 'het adverbiaal gebruik van de accusativus enkelvoud onzijdig, zoals μέγα'] }),
		item('v-telwoorden', 'telwoorden', 'De verbuiging van εἷς en οὐδείς/μηδείς.', { parts: ['εἷς', 'οὐδείς / μηδείς'] }),
		item('v-voornaamwoorden', 'voornaamwoorden', 'De verbuiging van de voornaamwoorden.'),
		item('v-voornaamwoorden-niet', 'voornaamwoorden: niet vereist', 'Niet bekend verondersteld: de indirect reflexiva (οὗ, οἷ, ἕ, σφεῖς enz.), de gecontraheerde vormen van ἑαυτοῦ enz., de crasisvormen van ὁ αὐτός enz., de vormen (ὅ)του, (ὅ)τῳ, ἅττα en ἄττα, en τοῦ, τῷ als vragend voornaamwoord.', { notRequired: true }),
		item('v-werkwoord-algemeen', 'werkwoorden: algemeen', 'Vorming en vervoeging/verbuiging.', {
			parts: [
				'activum, medium en passivum',
				'de uitgang -ῃ in de 2e persoon enkelvoud: praesens medium (λύῃ), futurum medium (λύσῃ), futurum passief (λυθήσῃ)',
				'enkelvoud en meervoud van indicativus, coniunctivus, optativus en imperativus (alleen de 2e personen)',
				'participia in alle naamvallen',
				'infinitivi',
				'augment en reduplicatie (zonder dubbel augment zoals ἑώρων); dat het augment kan wegvallen wordt bekend verondersteld'
			]
		}),
		item('v-praesens-imperfectum', 'praesens en imperfectum', 'Welke vormen je kent.', {
			parts: [
				'de thematische werkwoorden, exclusief de contracta met ο-stam (χρήομαι en ζήω niet)',
				'de athematische werkwoorden',
				'εἰμί en εἶμι (maar niet het imperfectum van εἶμι)'
			]
		}),
		item('v-aoristus', 'aoristus', 'Welke aoristusvormen je kent.', {
			parts: [
				'de regelmatige sigmatische aoristus (inclusief de werkwoorden op -νυμι en de vormen ἔδοξα en ἀπώλεσα) en de pseudo-sigmatische aoristus',
				'de stamaoristi ἔβην, ἔστην, ἔδυν, ἔφυν, ἔγνων',
				'de aoristi van τίθημι, ἵημι, δίδωμι',
				'de regelmatig gevormde aoristus op -θην',
				'van de passieve/intransitieve aoristi op -ην alleen διεφθάρην en ἐφάνην'
			]
		}),
		item('v-aoristus-thematisch', 'thematische aoristi', 'De thematische aoristi die bekend verondersteld worden.', {
			parts: ['ἤγαγον', 'εἷλον', 'ᾐσθόμην', '(ἀπ)έθανον', '(ἀπ)ωλόμην', '(ἀφ)ἱκόμην', 'ἔβαλον', 'ἐγενόμην', 'ἦλθον', 'ἑσπόμην', 'ηὗρον', 'ἠρόμην', 'ἔσχον', 'ὑπεσχόμην', 'ἔλαβον', 'εἶπον', 'ἔλιπον', 'ἔμαθον', 'εἶδον', 'ἔπαθον', 'ἐπιθόμην', 'ἔπιον', 'ἔπεσον', 'ἐπυθόμην', 'ἔτεκον', 'ἔτραπον', 'ἔτυχον', 'ἤνεγκον', 'ἔφυγον']
		}),
		item('v-aoristus-theta', 'aoristus op -θην: onregelmatige vormen', 'Naast de regelmatige vormen worden deze aoristi op -θην bekend verondersteld.', { parts: ['ἐβλήθην', 'ἐβουλήθην', 'ἐκλήθην', 'ἐρρήθην', 'ἐμνήσθην', 'ὤφθην', 'ηὑρέθην'] }),
		item('v-perfectum-actief', 'perfectum en plusquamperfectum actief', 'Exclusief de coniunctivus, optativus en imperativus.', {
			parts: [
				'de regelmatig gevormde kappa-perfecta',
				'de perfecta ἀκήκοα, (ἀπ)ὄλωλα, βέβηκα, βέβληκα, γέγονα, εἴρηκα, ἐλήλυθα, ηὕρηκα, λέλοιπα, πέποιθα',
				'de perfecta ἕστηκα, οἶδα (inclusief de imperativi ἴσθι en ἴστε) en τέθνηκα, met hun onregelmatige vervoeging',
				'van het plusquamperfectum de uitgangen -η, -ης, -ει, -εμεν, -ετε, -εσαν'
			]
		}),
		item('v-perfectum-medpass', 'perfectum en plusquamperfectum medium/passief', 'Exclusief de coniunctivus, optativus en imperativus.', { parts: ['de vormingen van het type λέλυμαι', 'de vorming van βέβλημαι'] }),
		item('v-futurum', 'futurum', 'Exclusief de optativus.', {
			parts: [
				'de regelmatig gevormde sigmatische futura, de futura attica en het futurum passief (type λυθήσομαι)',
				'ἀκούσομαι, (ἀπο)θανοῦμαι, βουλήσομαι, γενήσομαι, γνώσομαι, δόξω, ἕξω, ἐρῶ, ἔσομαι, εὑρήσω, οἴσω, ὄψομαι, πεσοῦμαι, σχήσω, φανήσομαι, φεύξομαι'
			]
		}),
		item('v-herkenbaar', 'herkenbare vormen', 'Werkwoordsvormen die niet genoemd zijn maar duidelijk herkenbaar (zoals ἐτέλεσα, ἐκελεύσθην, λέλειπται) worden in principe niet geannoteerd.', { notRequired: true })
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
		item('s-lidwoord', 'gebruik van het lidwoord', 'Wanneer het lidwoord er wel of niet staat en wat het doet.', {
			parts: [
				'het regelmatig ontbreken van het lidwoord bij een predicatieve bepaling en bij het naamwoordelijk deel van het gezegde',
				'zelfstandig gebruik van bijvoeglijke naamwoorden, participia, infinitivi (zonder aanvullingen) en voorzetselgroepen',
				'het lidwoord bij eigennamen',
				'het lidwoord bij αὐτός en πᾶς',
				'de verbindingen ὁ μέν … ὁ δέ … en οἱ μέν … οἱ δέ …',
				'het zelfstandig gebruik van ὁ δέ'
			]
		}),
		item('s-nominativus', 'nominativus', 'Functies van de nominativus.', { parts: ['onderwerp (subject)', 'naamwoordelijk deel van het gezegde'] }),
		item('s-genitivus', 'genitivus', 'Functies van de genitivus.', {
			parts: ['bijvoeglijke bepaling, inclusief de genitivus objectivus', 'aanvulling bij werkwoorden', 'aanvulling bij bijvoeglijke naamwoorden', 'bijwoordelijke bepaling van vergelijking en tijd', 'genitivus absolutus']
		}),
		item('s-dativus', 'dativus', 'Functies van de dativus.', {
			parts: ['meewerkend voorwerp', 'aanvulling bij werkwoorden', 'aanvulling bij bijvoeglijke naamwoorden', 'de bezitter bij het werkwoord εἶναι', 'bijwoordelijke bepaling van middel, wijze, maat, tijd, reden, plaats en oorzaak']
		}),
		item('s-accusativus', 'accusativus', 'Functies van de accusativus.', {
			parts: ['lijdend voorwerp (object)', 'onderwerp en naamwoordelijk deel van het gezegde in de a.c.i. en a.c.p.', 'bijwoordelijke bepaling van richting, tijdsduur, afstand en betrekking']
		}),
		item('s-vocativus', 'vocativus', 'De aanspreekvorm.'),
		item('s-voorzetsels', 'voorzetsels', 'Het gebruik van de naamvallen bij voorzetsels.'),
		item('s-bijvoeglijk', 'bijvoeglijke naamwoorden: gebruik', 'Bijvoeglijk en zelfstandig gebruik.'),
		item('s-trappen', 'trappen van vergelijking: gebruik', 'Gebruik en betekenis van de vergrotende en overtreffende trap.', {
			parts: ['vergrotende trap, ook met de betekenissen "tamelijk" en "te"', 'overtreffende trap: "-ste" en "zeer"', 'ὡς en ὅτι + overtreffende trap: "zo … mogelijk"']
		}),
		item('s-voornaamwoorden', 'voornaamwoorden: gebruik', 'Bijvoeglijk en zelfstandig gebruik, en het ingesloten antecedent van een betrekkelijke bijzin. De relatieve aansluiting en attractie worden niet bekend verondersteld.', { parts: ['bijvoeglijk en zelfstandig gebruik', 'het (ingesloten) antecedent van een betrekkelijke bijzin'] }),
		item('s-voornaamwoorden-niet', 'relatieve aansluiting en attractie', 'De relatieve aansluiting en de attractie worden niet bekend verondersteld.', { notRequired: true }),
		item('s-werkwoord-begrippen', 'werkwoorden: begrippen', 'Begrippen die je moet kunnen gebruiken.', { parts: ['overgankelijk (transitief) en onovergankelijk (intransitief)', 'directe en indirecte rede'] }),
		item('s-genera', 'activum, medium en passivum: gebruik', 'Gebruik en betekenis van de drie genera.', {
			parts: [
				'medium: belanguitdrukkend (indirect reflexief), direct reflexief, intransitief en passief gebruikt',
				'passivum (in aoristus- en futurumstam): passief gebruik en intransitief passivum',
				'het begrip medium tantum'
			]
		}),
		item('s-tijden-aspect', 'gebruik van de tijden en aspect', 'Het gebruik van de tijden uit de vormleer, inclusief het praesens historicum, en de aspectswaarden.', {
			parts: [
				'praesens en imperfectum (kernbetekenis: niet afgesloten): voortduring, poging, gewoonte of herhaalde handeling; achtergrondgebeurtenis in een verhaal',
				'aoristus (kernbetekenis: afgesloten): handeling gezien in zijn totaliteit (constaterend) of nadruk op begin- of eindpunt; gebeurtenissen die het verhaal voortstuwen',
				'perfectum en plusquamperfectum: een toestand als resultaat van de handeling in het heden, respectievelijk het verleden'
			]
		}),
		item('s-indicativus', 'indicativus: gebruik', 'Gebruik en betekenis van de indicativus.', { parts: ['realis', 'irrealis (in de hoofdzin met ἄν, in de conditionele bijzin zonder ἄν)'] }),
		item('s-coniunctivus', 'coniunctivus: gebruik', 'Gebruik en betekenis van de coniunctivus.', {
			parts: [
				'hoofdzinnen: aansporing, twijfel, verbod',
				'bijzinnen met ἄν: plausibele gebeurtenis in de toekomst (coniunctivus futuralis); herhaalbare of algemene handeling (coniunctivus generalis/iterativus)',
				'doelaangevend',
				'na werkwoorden van vrezen'
			]
		}),
		item('s-optativus', 'optativus: gebruik', 'Gebruik en betekenis van de optativus.', {
			parts: [
				'hoofdzinnen met ἄν: mogelijkheid (vaak met een optativus in de bijzin zonder ἄν), bescheiden geformuleerde mening, vriendelijk bevel of verzoek',
				'hoofdzinnen zonder ἄν (al dan niet met εἴθε of εἰ γάρ): wens',
				'conditionele bijzinnen zonder ἄν: mogelijkheid',
				'bijzinnen na een historische tijd of praesens historicum in de hoofdzin: indirecte rede; conditionele en temporele bijzinnen die naar een herhaalde handeling in het verleden verwijzen; doelaangevende bijzinnen en na werkwoorden van vrezen',
				'niet-conditionele bijzinnen met ἄν: mogelijkheid, bescheiden mening'
			]
		}),
		item('s-imperativus', 'imperativus: gebruik', 'Bevel of verzoek.'),
		item('s-infinitivus', 'infinitivus: gebruik', 'Gelijktijdig, voortijdig en natijdig, en de gebruiksmogelijkheden.', {
			parts: [
				'de begrippen gelijktijdig(heid), voortijdig(heid) en natijdig(heid)',
				'a.c.i. en n.c.i.',
				'na πρίν en ὥστε',
				'als aanvulling bij werkwoorden (inclusief ἔχω) en bijvoeglijke naamwoorden',
				'subjects- en objectsaccusativus',
				'gesubstantiveerde infinitivus'
			]
		}),
		item('s-participium', 'participium: gebruik', 'Gelijktijdig, voortijdig en natijdig, en de gebruiksmogelijkheden.', {
			parts: [
				'de begrippen gelijktijdig(heid), voortijdig(heid) en natijdig(heid)',
				'bijvoeglijk, zelfstandig en predicatief gebruik',
				'het participium futurum met doelaangevende betekenis',
				'genitivus absolutus met uitgedrukt onderwerp',
				'de participiumpartikels ἅτε, ὡς en καί(περ)',
				'als aanvulling bij τυγχάνω en λανθάνω en bij παύομαι en ἄρχομαι',
				'a.c.p. en n.c.p. bij werkwoorden van gevoel, waarneming of weten (bijvoorbeeld οἶδα)'
			]
		}),
		item('s-vraagzinnen', 'vraagzinnen', 'Directe en indirecte vragen, inclusief vraagpartikels.')
	]
};

export const GTC_2027_SECTIONS: readonly GrammarSection[] = [vormleer, syntaxis, stilistisch, narratologisch, argumentatief, herodotus, homerus, tragedie, ionisch, context];

export const GTC_2027: GrammarCatalogue = { id: 'gtc-2027', subject: 'Grieks', examYear: 2027, source: GTC_2027_SOURCE, sections: GTC_2027_SECTIONS };
