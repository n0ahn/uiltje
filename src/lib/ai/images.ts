// Browser-side photo preparation for the AI import: shrink to a JPEG so the request stays small (Vercel allows 4.5 MB
// per request) and nothing is ever stored. Photos live in memory only, until the request is sent.
export const MAX_IMAGES = 5;
const MAX_SIDE = 1600;
const TARGET_BYTES = 650_000;

export type PreparedImage = { id: string; name: string; mime: 'image/jpeg'; data: string; previewUrl: string };

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
	return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});
}

/** Throws an Error with a Dutch message when the file cannot be used. */
export async function prepareImage(file: File): Promise<PreparedImage> {
	if (!file.type.startsWith('image/')) throw new Error(`"${file.name}" is geen afbeelding. PDF's worden nog niet ondersteund.`);
	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(file);
	} catch {
		throw new Error(`"${file.name}" kan niet gelezen worden. Probeer een JPEG of PNG.`);
	}
	try {
		let side = MAX_SIDE;
		let quality = 0.85;
		let blob: Blob | null = null;
		for (let attempt = 0; attempt < 4; attempt++) {
			const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
			const canvas = document.createElement('canvas');
			canvas.width = Math.max(1, Math.round(bitmap.width * scale));
			canvas.height = Math.max(1, Math.round(bitmap.height * scale));
			const context = canvas.getContext('2d');
			if (!context) throw new Error('Foto verkleinen is mislukt.');
			context.fillStyle = '#fff'; // PNGs with transparency become white, not black
			context.fillRect(0, 0, canvas.width, canvas.height);
			context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
			blob = await canvasToBlob(canvas, quality);
			if (blob && blob.size <= TARGET_BYTES) break;
			side = Math.round(side * 0.85);
			quality = Math.max(0.6, quality - 0.08);
		}
		if (!blob) throw new Error(`"${file.name}" kan niet verkleind worden.`);
		return { id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`, name: file.name, mime: 'image/jpeg', data: await blobToBase64(blob), previewUrl: URL.createObjectURL(blob) };
	} finally {
		bitmap.close();
	}
}
