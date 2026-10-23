// "Plak uit tekst": one row per line. Prompt and answer are separated by a tab, ";" or "=" (first one found);
// extra accepted answers are separated by "/". Lines without a separator are skipped and reported.

export type PastedRow = { prompt: string; answers: string[] };
export type PasteResult = { rows: PastedRow[]; skipped: number };

export function parsePaste(text: string): PasteResult {
	const rows: PastedRow[] = [];
	let skipped = 0;
	for (const line of text.split(/\r?\n/)) {
		if (line.trim() === '') continue;
		const match = /\t|;|=/.exec(line);
		if (!match) {
			skipped++;
			continue;
		}
		const prompt = line.slice(0, match.index).trim();
		const answers = line
			.slice(match.index + 1)
			.split('/')
			.map((part) => part.trim())
			.filter(Boolean);
		if (!prompt || answers.length === 0) {
			skipped++;
			continue;
		}
		rows.push({ prompt, answers });
	}
	return { rows, skipped };
}