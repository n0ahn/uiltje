// zod schemas for what the social RPCs return (validate at every boundary), plus the mapping to app types.
import { z } from 'zod';
import { StorageError } from '../storage/adapter';
import type { Challenge, ChallengeScore, FoundPerson, Friendship, IncomingShare, LeaderRow, MyProfile, Person, ProfileView, Relation } from './types';

const nullableText = z.string().nullable();
const time = z.string().nullable();
const count = z.coerce.number();

export const personRow = z.object({
	id: z.string(),
	username: z.string(),
	display_name: z.string(),
	avatar_path: nullableText,
	avatar_updated_at: time
});
const relationEnum = z.enum(['none', 'friend', 'outgoing', 'incoming', 'self']);

export const profileRow = personRow.extend({ show_on_leaderboard: z.boolean(), friend_code: z.string() });
export const foundRow = personRow.extend({ relation: relationEnum });
export const friendshipRow = z.object({
	user_id: z.string(),
	username: z.string(),
	display_name: z.string(),
	avatar_path: nullableText,
	avatar_updated_at: time,
	status: z.enum(['pending', 'accepted']),
	incoming: z.boolean(),
	created_at: z.string()
});
export const leaderRow = z.object({
	user_id: z.string(),
	username: z.string(),
	display_name: z.string(),
	avatar_path: nullableText,
	avatar_updated_at: time,
	practiced: count,
	correct: count,
	sessions: count,
	is_me: z.boolean()
});
export const incomingRow = z.object({
	share_id: z.string(),
	set_title: z.string(),
	subject: z.string(),
	list_count: count,
	row_count: count,
	sender_id: z.string(),
	sender_name: z.string(),
	sender_username: z.string(),
	sender_avatar_path: nullableText,
	sender_avatar_updated_at: time,
	created_at: z.string()
});
const score = z.union([z.null(), z.coerce.number()]);
export const challengeRow = z.object({
	challenge_id: z.string(),
	set_title: z.string(),
	subject: z.string(),
	row_count: count,
	i_am_challenger: z.boolean(),
	status: z.enum(['pending', 'accepted', 'declined']),
	created_at: z.string(),
	other_id: z.string(),
	other_name: z.string(),
	other_username: z.string(),
	other_avatar_path: nullableText,
	other_avatar_updated_at: time,
	my_set_id: nullableText,
	my_score: score,
	my_grade: score,
	my_at: time,
	their_score: score,
	their_grade: score,
	their_at: time
});

export const sharedRow = z.object({
	set_id: z.string(),
	title: z.string(),
	subject: z.string(),
	folder: nullableText,
	list_count: count,
	row_count: count,
	data: z.unknown(),
	owner_name: z.string(),
	owner_username: z.string(),
	owner_avatar_path: nullableText,
	owner_avatar_updated_at: time
});

export const profileViewRow = z.object({
	id: z.string(),
	username: z.string(),
	display_name: z.string(),
	avatar_path: nullableText,
	avatar_updated_at: time,
	created_at: z.string(),
	is_self: z.boolean(),
	stats: z
		.object({ answers: count, correct: count, sessions: count, tests: count, mastered: count })
		.nullable(),
	activity: z.array(z.coerce.number()),
	sets: z.array(
		z.object({
			id: z.string(),
			title: z.string(),
			subject: z.string(),
			list_count: count,
			row_count: count,
			is_public: z.boolean(),
			updated_at: z.string()
		})
	)
});

/** Public URL of a stored avatar path; the version makes browsers fetch a new photo after a change. */
export type AvatarUrl = (path: string | null, updatedAt: string | null) => string | null;

export function parseRows<T extends z.ZodType>(schema: T, data: unknown): z.infer<T>[] {
	const result = z.array(schema).safeParse(data);
	if (!result.success) {
		console.error('[social] unexpected data', result.error);
		throw new StorageError('Laden lukt niet. Probeer het later opnieuw.');
	}
	return result.data;
}

const name = (displayName: string, username: string) => displayName.trim() || username;

export function toPerson(url: AvatarUrl, id: string, username: string, displayName: string, path: string | null, at: string | null): Person {
	return { id, username, displayName: name(displayName, username), avatarUrl: url(path, at) };
}

export function toProfile(url: AvatarUrl, r: z.infer<typeof profileRow>): MyProfile {
	return {
		...toPerson(url, r.id, r.username, r.display_name, r.avatar_path, r.avatar_updated_at),
		showOnLeaderboard: r.show_on_leaderboard,
		friendCode: r.friend_code
	};
}

export function toFound(url: AvatarUrl, r: z.infer<typeof foundRow>): FoundPerson {
	return { ...toPerson(url, r.id, r.username, r.display_name, r.avatar_path, r.avatar_updated_at), relation: r.relation as Relation };
}

export function toFriendship(url: AvatarUrl, r: z.infer<typeof friendshipRow>): Friendship {
	return {
		...toPerson(url, r.user_id, r.username, r.display_name, r.avatar_path, r.avatar_updated_at),
		status: r.status,
		incoming: r.incoming,
		createdAt: Date.parse(r.created_at)
	};
}

export function toLeaderRow(url: AvatarUrl, r: z.infer<typeof leaderRow>): LeaderRow {
	return {
		...toPerson(url, r.user_id, r.username, r.display_name, r.avatar_path, r.avatar_updated_at),
		practiced: r.practiced,
		correct: r.correct,
		sessions: r.sessions,
		isMe: r.is_me
	};
}

export function toIncoming(url: AvatarUrl, r: z.infer<typeof incomingRow>): IncomingShare {
	return {
		shareId: r.share_id,
		title: r.set_title,
		subject: r.subject,
		listCount: r.list_count,
		rowCount: r.row_count,
		sender: toPerson(url, r.sender_id, r.sender_username, r.sender_name, r.sender_avatar_path, r.sender_avatar_updated_at),
		createdAt: Date.parse(r.created_at)
	};
}

export function toProfileView(url: AvatarUrl, r: z.infer<typeof profileViewRow>): ProfileView {
	return {
		...toPerson(url, r.id, r.username, r.display_name, r.avatar_path, r.avatar_updated_at),
		isSelf: r.is_self,
		memberSince: Date.parse(r.created_at) || 0,
		stats: r.stats,
		activity: r.activity,
		sets: r.sets.map((s) => ({
			id: s.id,
			title: s.title,
			subject: s.subject,
			listCount: s.list_count,
			rowCount: s.row_count,
			isPublic: s.is_public,
			updatedAt: Date.parse(s.updated_at) || 0
		}))
	};
}

function toScore(value: number | null, grade: number | null, at: string | null): ChallengeScore | null {
	return value === null ? null : { score: value, grade, at: at ? Date.parse(at) : 0 };
}

export function toChallenge(url: AvatarUrl, r: z.infer<typeof challengeRow>): Challenge {
	return {
		id: r.challenge_id,
		title: r.set_title,
		subject: r.subject,
		rowCount: r.row_count,
		iAmChallenger: r.i_am_challenger,
		status: r.status,
		createdAt: Date.parse(r.created_at),
		other: toPerson(url, r.other_id, r.other_username, r.other_name, r.other_avatar_path, r.other_avatar_updated_at),
		mySetId: r.my_set_id,
		me: toScore(r.my_score, r.my_grade, r.my_at),
		them: toScore(r.their_score, r.their_grade, r.their_at)
	};
}
