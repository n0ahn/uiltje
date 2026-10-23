// `getSocial()` gives the social API for the current sign-in client (browser only, like `getStorage()`).
// Guests have no account, so only the calls that work anonymously (opening a share or invite link) succeed for them.
import { auth } from '../state/auth.svelte';
import { StorageError } from '../storage/adapter';
import { createSocialApi } from './api';
import type { SocialApi } from './types';

let cached: { client: unknown; api: SocialApi } | null = null;

export function getSocial(): SocialApi {
	const client = auth.client;
	if (!client) throw new StorageError('Even geduld, de verbinding wordt gemaakt.');
	if (cached?.client !== client) cached = { client, api: createSocialApi(client, () => auth.user?.id ?? null) };
	return cached.api;
}
