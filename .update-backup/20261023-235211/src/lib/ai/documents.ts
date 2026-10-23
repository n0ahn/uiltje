// Browser-side document preparation for the AI import. Nothing is stored; the file lives in memory until the request.
// PDF: sent as-is to Gemini (it reads scans and print). DOCX: Gemini cannot read it, so the text is pulled out here with
// a tiny zip reader (no dependency) and sent as plain text. Images inside a DOCX are ignored.
export const MAX_PDF_BYTES = 2_800_000; // base64 grows 4/3: stays under the 3.8 MB body cap (Vercel allows 4.5 MB)
export const MAX_DOCX_TEXT = 40_000;
const MAX_XML_BYTES = 20_000_000; // zip bomb guard

export type PreparedDocument = { kind: 'pdf'; name: string; data: string } | { kind: 'docx'; name: string; text: string };

const PDF_TYPE = 'application/pdf';
const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});
}

/** Throws an Error with a Dutch message when the file cannot be used. */
export async function prepareDocument(file: File): Promise<PreparedDocument> {
	const lower = file.name.toLowerCase();
	if (file.type === PDF_TYPE || lower.endsWith('.pdf')) return preparePdf(file);
	if (file.type === DOCX_TYPE || lower.endsWith('.docx')) return prepareDocx(file);
	if (lower.endsWith('.doc')) throw new Error(`"${file.name}" is een oud Word-bestand. Sla het in Word op als .docx of PDF.`);
	throw new Error(`"${file.name}" is geen PDF of Word-document (.docx).`);
}

async function preparePdf(file: File): Promise<PreparedDocument> {
	if (file.size > MAX_PDF_BYTES) throw new Error(`"${file.name}" is te groot (maximaal ${(MAX_PDF_BYTES / 1_000_000).toFixed(1).replace('.', ',')} MB). Knip de PDF in stukken of gebruik alleen de pagina's die je nodig hebt.`);
	const head = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
	if (head !== '%PDF-') throw new Error(`"${file.name}" is geen geldige PDF.`);
	return { kind: 'pdf', name: file.name, data: await blobToBase64(file) };
}

async function prepareDocx(file: File): Promise<PreparedDocument> {
	let xml: string;
	try {
		xml = await readZipEntry(new Uint8Array(await file.arrayBuffer()), 'word/document.xml');
	} catch {
		throw new Error(`"${file.name}" kan niet gelezen worden. Is het een echt .docx-bestand?`);
	}
	const doc = new DOMParser().parseFromString(xml, 'application/xml');
	const body = doc.getElementsByTagNameNS('*', 'body')[0];
	if (!body || doc.getElementsByTagName('parsererror').length > 0) throw new Error(`"${file.name}" kan niet gelezen worden.`);
	const lines: string[] = [];
	collectBlocks(body, lines);
	const text = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
	if (text === '') throw new Error(`Er staat geen tekst in "${file.name}". Foto's in Word worden niet gelezen: gebruik daarvoor de optie Foto's.`);
	if (text.length > MAX_DOCX_TEXT) throw new Error(`"${file.name}" is te lang (${text.length.toLocaleString('nl-NL')} tekens, maximaal ${MAX_DOCX_TEXT.toLocaleString('nl-NL')}). Gebruik een kortere versie.`);
	return { kind: 'docx', name: file.name, text };
}

function paragraphText(p: Element): string {
	let text = '';
	const visit = (node: Element) => {
		for (const child of node.children) {
			switch (child.localName) {
				case 't':
					text += child.textContent ?? '';
					break;
				case 'tab':
					text += '\t';
					break;
				case 'br':
				case 'cr':
					text += '\n';
					break;
				default:
					visit(child); // runs, hyperlinks, tracked insertions
			}
		}
	};
	visit(p);
	return text;
}

function collectBlocks(parent: Element, lines: string[]) {
	for (const child of parent.children) {
		if (child.localName === 'p') {
			lines.push(paragraphText(child));
		} else if (child.localName === 'tbl') {
			for (const row of child.children) {
				if (row.localName !== 'tr') continue;
				const cells = [...row.children]
					.filter((cell) => cell.localName === 'tc')
					.map((cell) => {
						const inner: string[] = [];
						collectBlocks(cell, inner);
						return inner.join(' ').trim();
					});
				lines.push(cells.join('\t'));
			}
		} else if (child.localName === 'sdt') {
			for (const content of child.children) if (content.localName === 'sdtContent') collectBlocks(content, lines);
		}
	}
}

/** Minimal zip reader: finds one entry through the central directory and inflates it (stored or deflate). */
async function readZipEntry(zip: Uint8Array, wanted: string): Promise<string> {
	const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
	let eocd = -1;
	for (let i = zip.length - 22; i >= Math.max(0, zip.length - 22 - 65_535); i--) {
		if (view.getUint32(i, true) === 0x06054b50) {
			eocd = i;
			break;
		}
	}
	if (eocd < 0) throw new Error('not a zip');
	const count = view.getUint16(eocd + 10, true);
	let pos = view.getUint32(eocd + 16, true);
	for (let n = 0; n < count; n++) {
		if (view.getUint32(pos, true) !== 0x02014b50) break;
		const method = view.getUint16(pos + 10, true);
		const compressed = view.getUint32(pos + 20, true);
		const size = view.getUint32(pos + 24, true);
		const nameLength = view.getUint16(pos + 28, true);
		const extraLength = view.getUint16(pos + 30, true);
		const commentLength = view.getUint16(pos + 32, true);
		const localOffset = view.getUint32(pos + 42, true);
		const name = new TextDecoder().decode(zip.subarray(pos + 46, pos + 46 + nameLength));
		if (name === wanted) {
			if (size > MAX_XML_BYTES) throw new Error('too big');
			const start = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
			const data = zip.subarray(start, start + compressed);
			if (method === 0) return new TextDecoder().decode(data);
			if (method !== 8) throw new Error('unsupported compression');
			const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
			return await new Response(stream).text();
		}
		pos += 46 + nameLength + extraLength + commentLength;
	}
	throw new Error('entry not found');
}
