// Unsaved concepts: while a set is incomplete (e.g. a template with empty answers) it cannot be saved as a set,
// so the editor keeps the working copy here and restores it when the page is opened again.
import type { DraftSet } from './types';

const KEY = (setId: string) => `uiltje:draft:${setId}`;

export function loadDraft(setId: string): DraftSet | null {
	try {
		const raw = localStorage.getItem(KEY(setId));
		if (!raw) return null;
		const data = JSON.parse(raw) as DraftSet;
		return data && Array.isArray(data.lists) && typeof data.title === 'string' ? data : null;
	} catch {
		return null;
	}
}

export function saveDraft(setId: string, draft: DraftSet): void {
	try {
		localStorage.setItem(KEY(setId), JSON.stringify(draft));
	} catch {
		// best effort
	}
}

export function clearDraft(setId: string): void {
	try {
		localStorage.removeItem(KEY(setId));
	} catch {
		// best effort
	}
}