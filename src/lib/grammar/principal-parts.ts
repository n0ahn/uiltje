// Stamtijden die bekend verondersteld worden (syllabus LTC vwo 2027, appendix), plus de deponentia en semi-deponentia.
// A trailing "*" in the source text marks forms that are listed for completeness but not assumed known.
import type { PrincipalParts } from './types';

const VERBS = `
accipio accepi acceptum
ago egi actum
aperio aperui apertum
aspicio aspexi aspectum
aufero abstuli ablatum
cado cecidi casum*
caedo cecidi caesum
capio cepi captum
cedo cessi cessum*
censeo censui censum
cerno crevi cretum*
claudo clausi clausum
cogo coegi coactum
colo colui cultum
comprehendo comprehendi comprehensum
consulo consului consultum
credo credidi creditum*
cresco crevi cretum*
cupio cupivi cupitum*
curro cucurri
decerno decrevi decretum
defendo defendi defensum
desero deserui desertum
dico dixi dictum
disco didici -
divido divisi divisum
do dedi datum
doceo docui doctum*
duco duxi ductum
emo emi emptum
eo ii
facio feci factum
fero tuli latum
flecto flexi flexum
fluo fluxi fluxum*
frango fregi fractum
fugio fugi -
gero gessi gestum
haereo haesi haesum*
iaceo iacui -
iacio ieci iactum
instruo instruxi instructum
intellego intellexi intellectum
interficio interfeci interfectum
iubeo iussi iussum
iungo iunxi iunctum
iuvo iuvi iutum
lego legi lectum
maneo mansi
metuo metui -
misceo miscui mixtum
mitto misi missum
moveo movi motum
nolo nolui -
nosco novi notum*
pario peperi partum*
pello pepuli pulsum
peto petivi petitum
pono posui positum
posco poposci -
possum potui -
premo pressi pressum
quaero quaesivi quaesitum
rapio rapui raptum
rego rexi rectum*
relinquo reliqui relictum
respondeo respondi responsum
rideo risi risum*
rumpo rupi ruptum
ruo rui rutum*
scribo scripsi scriptum
sedeo sedi sessum*
sentio sensi sensum
sino sivi situm
sisto stiti statum*
solvo solvi solutum
statuo statui statutum
sto steti statum*
struo struxi structum
suadeo suasi suasum
sum fui -
sumo sumpsi sumptum
surgo surrexi surrectum
tango tetigi tactum
tego texi tectum
teneo tenui tentum*
tollo sustuli sublatus
traho traxi tractum
tremo tremui -
veho vexi -
venio veni
verto verti -
video vidi visum
vinco vici victum
vivo vixi
volo volui -
volvo volvi volutum
`;

const DEPONENTS = `
aggredior aggressus sum
audeo ausus sum
fio factus sum
fruor fructus sum
fungor functus sum
gaudeo gavisus sum*
loquor locutus sum
mereor meritus sum
morior mortuus sum
nascor natus sum
obliviscor oblitus sum
orior ortus sum
patior passus sum
polliceor pollicitus sum
proficiscor profectus sum
queror questus sum
reor ratus sum
sequor secutus sum
soleo solitus sum
utor usus sum
vehor vectus sum
vereor veritus sum
vertor versus sum
`;

function parse(text: string, deponent: boolean): PrincipalParts[] {
	return text
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const [verb, ...rest] = line.split(/\s+/) as [string, ...string[]];
			const notRequired = line.endsWith('*');
			// A deponent's forms are "factus sum": the "sum" belongs to the perfect, so it stays one form.
			const forms = (deponent ? [rest.join(' ')] : rest).map((f) => f.replace(/\*$/, ''));
			return { verb, forms, deponent, notRequired };
		});
}

export const PRINCIPAL_PARTS: readonly PrincipalParts[] = [...parse(VERBS, false), ...parse(DEPONENTS, true)];
