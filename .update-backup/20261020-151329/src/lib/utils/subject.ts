// Subjects are free text on a set ("Latijn", "Grieks", ...). Pages use a lowercase slug in the URL.
import type { Accent } from '../components/ui/accent';
import { accentFor } from '../components/ui/accent';

export function subjectSlug(subject: string): string {
	return encodeURIComponent(subject.trim().toLowerCase());
}

/** Same subject, ignoring case and surrounding spaces. */
export function sameSubject(a: string, b: string): boolean {
	return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Latijn = terracotta, Grieks = sky (DESIGN §2.1); other subjects get a stable accent from their name. */
export function subjectAccent(subject: string): Accent {
	const key = subject.trim().toLowerCase();
	if (key === 'latijn') return 'primary';
	if (key === 'grieks') return 'sky';
	return accentFor(key);
}
