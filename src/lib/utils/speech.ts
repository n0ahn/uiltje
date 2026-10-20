// Reading words aloud with the browser's own voices (no files, no server). Used by the dictation mode.
// Subjects are free text, so the language comes from the subject name; unknown subjects use the app language.

const LANGUAGES: [RegExp, string][] = [
	[/latijn|latin/i, 'la'],
	[/grieks|greek/i, 'el-GR'],
	[/engels|english/i, 'en-GB'],
	[/frans|french/i, 'fr-FR'],
	[/duits|german/i, 'de-DE'],
	[/spaans|spanish/i, 'es-ES'],
	[/italiaans|italian/i, 'it-IT'],
	[/nederlands|dutch/i, 'nl-NL']
];

export function languageFor(subject: string): string {
	return LANGUAGES.find(([pattern]) => pattern.test(subject))?.[1] ?? 'nl-NL';
}

export function canSpeak(): boolean {
	return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

/** Reads `text` aloud. Latin has no voice in most browsers, so Italian is used (the pronunciation is close). */
export function speak(text: string, lang: string): void {
	if (!canSpeak() || text.trim() === '') return;
	const synth = window.speechSynthesis;
	synth.cancel();
	const voices = synth.getVoices();
	const want = lang === 'la' ? 'it' : lang.split('-')[0]!;
	const voice = voices.find((v) => v.lang.toLowerCase().startsWith(want.toLowerCase()));
	const utterance = new SpeechSynthesisUtterance(text);
	utterance.lang = voice?.lang ?? (lang === 'la' ? 'it-IT' : lang);
	if (voice) utterance.voice = voice;
	utterance.rate = 0.85;
	synth.speak(utterance);
}
