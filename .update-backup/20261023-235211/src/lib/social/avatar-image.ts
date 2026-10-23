// Shrinks a chosen picture to a small square WebP in the browser before it is uploaded (DOM only).
export const AVATAR_MAX_INPUT_BYTES = 5 * 1024 * 1024; // what a person may pick
export const AVATAR_SIZE = 512; // px, square
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** A Dutch error message when the file is not usable, otherwise null. */
export function checkAvatarFile(file: File): string | null {
	if (!ACCEPTED.includes(file.type)) return 'Kies een foto (JPG, PNG of WebP).';
	if (file.size > AVATAR_MAX_INPUT_BYTES) return 'Deze foto is te groot. Kies een foto van maximaal 5 MB.';
	return null;
}

/** Center-crops to a square and scales to `AVATAR_SIZE`, then encodes as WebP (a few tens of KB). */
export async function shrinkAvatar(file: File): Promise<Blob> {
	const bitmap = await createImageBitmap(file).catch(() => null);
	if (!bitmap) throw new Error('Deze foto kan niet worden gelezen.');
	const side = Math.min(bitmap.width, bitmap.height);
	const size = Math.min(AVATAR_SIZE, side);
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Deze foto kan niet worden verwerkt.');
	ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
	bitmap.close();
	const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85));
	// Safari older than 17 cannot encode WebP and hands back PNG: still fine, the bucket takes it, but name stays .webp.
	if (!blob) throw new Error('Deze foto kan niet worden verwerkt.');
	return blob;
}
