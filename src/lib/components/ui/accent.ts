// Accent colors used for subjects, progress bars and avatars. Values map to theme tokens in layout.css.
export const ACCENTS = ['primary', 'sky', 'sage', 'lilac', 'wheat'] as const;
export type Accent = (typeof ACCENTS)[number];

/** Inline style that sets --accent for a component. */
export function accentStyle(accent: Accent): string {
	return `--accent: var(--color-${accent})`;
}

/** Stable accent for a name (avatars, extra subjects). */
export function accentFor(text: string): Accent {
	let hash = 0;
	for (const ch of text) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
	return ACCENTS[hash % ACCENTS.length] as Accent;
}