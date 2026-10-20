import type { User } from '@supabase/supabase-js';

function text(value: unknown): string | null {
	return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/** Name shown in the UI. Guests are "gast". */
export function displayName(user: User | null): string {
	if (!user) return 'gast';
	const meta = user.user_metadata;
	return text(meta.full_name) ?? text(meta.name) ?? text(meta.user_name) ?? user.email?.split('@')[0] ?? 'gast';
}

/** `@username` shown under the name; derived from the e-mail until profiles exist (phase 5). */
export function username(user: User | null): string {
	if (!user) return 'gast';
	const meta = user.user_metadata;
	return text(meta.user_name) ?? user.email?.split('@')[0] ?? 'gast';
}