// Supabase implementation of SocialApi (phase 6). Friends, leaderboard and sharing go through security-definer RPCs
// (see ai/sql/002_social.sql), so nobody ever reads another user's tables directly. Account only: guests have none of this.
import type { SupabaseClient } from '@supabase/supabase-js';
import { parseStudySet } from '../schema/migrate';
import { StorageError } from '../storage/adapter';
import {
	challengeRow,
	foundRow,
	friendshipRow,
	incomingRow,
	leaderRow,
	parseRows,
	profileRow,
	profileViewRow,
	sharedRow,
	toChallenge,
	toFound,
	toFriendship,
	toIncoming,
	toLeaderRow,
	toPerson,
	toProfile,
	toProfileView,
	type AvatarUrl
} from './rows';
import type { FriendOutcome, SharedSet, SocialApi } from './types';

export const AVATAR_BUCKET = 'avatars';
const PROFILE_COLUMNS = 'id,username,display_name,avatar_path,avatar_updated_at,show_on_leaderboard,friend_code';
const USERNAME = /^[a-z0-9_]{3,20}$/;

function fail(error: { message?: string; code?: string } | null, message = 'Er ging iets mis. Controleer je internetverbinding en probeer het opnieuw.'): never {
	console.error('[social]', error);
	throw new StorageError(message);
}

const OUTCOMES: FriendOutcome[] = ['pending', 'accepted', 'exists', 'unknown', 'self'];
function outcome(value: unknown): FriendOutcome {
	return OUTCOMES.find((o) => o === value) ?? 'unknown';
}

export function createSocialApi(client: SupabaseClient, userId: () => string | null): SocialApi {
	const url: AvatarUrl = (path, at) =>
		path ? `${client.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl}?v=${at ? Date.parse(at) : 0}` : null;

	const me = (): string => {
		const id = userId();
		if (!id) throw new StorageError('Log in om dit te doen.');
		return id;
	};

	async function rpc(name: string, args?: Record<string, unknown>, message?: string): Promise<unknown> {
		const { data, error } = await client.rpc(name, args);
		if (error) fail(error, message);
		return data;
	}

	async function readProfile() {
		const { data, error } = await client.from('profiles').select(PROFILE_COLUMNS).eq('id', me()).maybeSingle();
		if (error) fail(error);
		const [row] = parseRows(profileRow, data ? [data] : []);
		if (!row) throw new StorageError('Je profiel is niet gevonden. Probeer opnieuw in te loggen.');
		return toProfile(url, row);
	}

	async function toShared(data: unknown): Promise<SharedSet | null> {
		const [row] = parseRows(sharedRow, data);
		if (!row) return null;
		const parsed = parseStudySet(row.data);
		if (!parsed.ok) throw new StorageError('Deze set kan niet worden gelezen.');
		return {
			set: parsed.set,
			listCount: row.list_count,
			rowCount: row.row_count,
			owner: toPerson(url, '', row.owner_username, row.owner_name, row.owner_avatar_path, row.owner_avatar_updated_at)
		};
	}

	return {
		getMyProfile: readProfile,

		async updateProfile(changes) {
			const update: Record<string, unknown> = {};
			const meta: Record<string, string> = {};
			if (changes.displayName !== undefined) {
				const name = changes.displayName.trim();
				if (name.length < 1 || name.length > 40) throw new StorageError('Je naam moet tussen 1 en 40 tekens zijn.');
				update.display_name = name;
				meta.display_name = name;
			}
			if (changes.username !== undefined) {
				const name = changes.username.trim().toLowerCase();
				if (!USERNAME.test(name)) throw new StorageError('Gebruikersnaam: 3–20 tekens, alleen letters, cijfers en _.');
				const current = await readProfile();
				if (name !== current.username) {
					const free = await rpc('username_available', { name });
					if (free !== true) throw new StorageError('Deze gebruikersnaam is al bezet.');
				}
				update.username = name;
				meta.username = name;
			}
			if (changes.showOnLeaderboard !== undefined) update.show_on_leaderboard = changes.showOnLeaderboard;
			if (Object.keys(update).length > 0) {
				const { error } = await client.from('profiles').update(update).eq('id', me());
				if (error) fail(error, error.code === '23505' ? 'Deze gebruikersnaam is al bezet.' : undefined);
			}
			// The header reads name and @username from the sign-in metadata, so keep that in step.
			if (Object.keys(meta).length > 0) {
				const { error } = await client.auth.updateUser({ data: meta });
				if (error) fail(error);
			}
			return readProfile();
		},

		async uploadAvatar(image) {
			const id = me();
			if (image.size > 2 * 1024 * 1024) throw new StorageError('De foto is te groot (maximaal 2 MB).');
			const path = `${id}/avatar.webp`;
			const { error } = await client.storage.from(AVATAR_BUCKET).upload(path, image, { upsert: true, contentType: image.type || 'image/webp', cacheControl: '3600' });
			if (error) fail(error, 'De foto uploaden is niet gelukt. Probeer het opnieuw.');
			const { error: updateError } = await client
				.from('profiles')
				.update({ avatar_path: path, avatar_updated_at: new Date().toISOString() })
				.eq('id', id);
			if (updateError) fail(updateError);
			return readProfile();
		},

		async removeAvatar() {
			const id = me();
			const { error } = await client.storage.from(AVATAR_BUCKET).remove([`${id}/avatar.webp`]);
			if (error) fail(error);
			const { error: updateError } = await client.from('profiles').update({ avatar_path: null, avatar_updated_at: null }).eq('id', id);
			if (updateError) fail(updateError);
			return readProfile();
		},

		async searchPeople(query) {
			if (query.trim().length < 3) return [];
			return parseRows(foundRow, await rpc('search_profiles', { q: query })).map((r) => toFound(url, r));
		},

		async sendFriendRequest(personId) {
			return outcome(await rpc('send_friend_request', { target: personId }));
		},

		async respondToRequest(personId, accept) {
			await rpc('respond_friend_request', { requester: personId, accept });
		},

		async removeFriendship(personId) {
			await rpc('remove_friendship', { other: personId });
		},

		async listFriendships() {
			return parseRows(friendshipRow, await rpc('list_friendships')).map((r) => toFriendship(url, r));
		},

		async lookupInvite(code) {
			if (!/^[a-z0-9]{8,64}$/i.test(code)) return null;
			const [row] = parseRows(foundRow, await rpc('lookup_friend_code', { code }));
			return row ? toFound(url, row) : null;
		},

		async acceptInvite(code) {
			return outcome(await rpc('add_friend_by_code', { code }));
		},

		async regenerateInviteCode() {
			const code = await rpc('regenerate_friend_code');
			if (typeof code !== 'string') fail(null);
			return code;
		},

		async leaderboard(sinceMs) {
			const rows = parseRows(leaderRow, await rpc('leaderboard', { p_since: new Date(sinceMs).toISOString() }));
			return rows.map((r) => toLeaderRow(url, r));
		},

		async getShareToken(setId) {
			const { data, error } = await client.from('sets').select('share_token').eq('owner_id', me()).eq('id', setId).maybeSingle();
			if (error) fail(error);
			return typeof data?.share_token === 'string' ? data.share_token : null;
		},

		async enableShare(setId) {
			const token = await rpc('enable_set_share', { p_set_id: setId }, 'Delen is niet gelukt. Staat de set al in je account?');
			if (typeof token !== 'string') fail(null);
			return token;
		},

		async disableShare(setId) {
			await rpc('disable_set_share', { p_set_id: setId });
		},

		async getSharedSet(token) {
			if (!/^[a-z0-9]{16,64}$/i.test(token)) return null;
			return toShared(await rpc('get_shared_set', { p_token: token }));
		},

		async sendSetToFriend(setId, friendId) {
			await rpc('send_set_to_friend', { p_set_id: setId, p_friend_id: friendId }, 'Versturen is niet gelukt. Staat de set al in je account?');
		},

		async listIncomingShares() {
			return parseRows(incomingRow, await rpc('list_incoming_shares')).map((r) => toIncoming(url, r));
		},

		async getIncomingShare(shareId) {
			return toShared(await rpc('get_incoming_share', { p_share_id: shareId }));
		},

		async respondToShare(shareId, accept) {
			await rpc('respond_set_share', { p_share_id: shareId, p_accept: accept });
		},

		async sendChallenge(setId, friendId) {
			await rpc('send_challenge', { p_set_id: setId, p_friend_id: friendId }, 'Uitdagen is niet gelukt. Staat de set in je account en heeft hij rijen?');
		},

		async listChallenges() {
			return parseRows(challengeRow, await rpc('list_challenges', undefined, 'Uitdagingen laden lukt niet.')).map((r) => toChallenge(url, r));
		},

		async getChallengeSet(challengeId) {
			return toShared(await rpc('get_challenge_set', { p_id: challengeId }));
		},

		async respondToChallenge(challengeId, accept, copySetId) {
			await rpc('respond_challenge', { p_id: challengeId, p_accept: accept, p_copy_set_id: copySetId ?? null });
		},

		async removeChallenge(challengeId) {
			await rpc('delete_challenge', { p_id: challengeId });
		},

		async getProfile(username) {
			const name = username.trim().toLowerCase();
			if (!USERNAME.test(name)) return null;
			const data = await rpc('get_profile', { p_username: name }, 'Profiel laden lukt niet.');
			if (data === null || data === undefined) return null;
			const parsed = profileViewRow.safeParse(data);
			if (!parsed.success) {
				console.error('[social] unexpected profile', parsed.error);
				throw new StorageError('Laden lukt niet. Probeer het later opnieuw.');
			}
			return toProfileView(url, parsed.data);
		},

		async getVisibility(setId) {
			const { data, error } = await client.from('sets').select('is_public').eq('owner_id', me()).eq('id', setId).maybeSingle();
			if (error) fail(error);
			return data?.is_public === true;
		},

		async setVisibility(setId, isPublic) {
			const { error } = await client.from('sets').update({ is_public: isPublic }).eq('owner_id', me()).eq('id', setId);
			if (error) fail(error, 'Zichtbaarheid aanpassen is niet gelukt.');
		},

		async getPublicSet(setId) {
			if (!/^[0-9a-f-]{36}$/i.test(setId)) return null;
			return toShared(await rpc('get_public_set', { p_set_id: setId }));
		},

		async deleteAccount() {
			const id = me();
			// Best effort: the photo is the only file we store, and storage objects cannot be removed from SQL.
			await client.storage.from(AVATAR_BUCKET).remove([`${id}/avatar.webp`]);
			await rpc('delete_my_account', undefined, 'Account verwijderen is niet gelukt.');
		}
	};
}
