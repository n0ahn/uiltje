// Types for profile, friends, leaderboard and sharing (phase 6). Pure TS: no Svelte, DOM or Supabase imports.
import type { StudySet } from '../schema/types';

/** Enough of a person to draw an avatar and a name. `avatarUrl` is null when they have no photo. */
export type Person = { id: string; username: string; displayName: string; avatarUrl: string | null };

export type Relation = 'none' | 'friend' | 'outgoing' | 'incoming' | 'self';

export type FoundPerson = Person & { relation: Relation };

export type Friendship = Person & {
	status: 'pending' | 'accepted';
	/** The request came from them (only meaningful while pending). */
	incoming: boolean;
	/** ms since epoch */
	createdAt: number;
};

export type MyProfile = Person & {
	showOnLeaderboard: boolean;
	/** The secret part of the invite link `/i/<friendCode>`. */
	friendCode: string;
};

export type LeaderRow = Person & {
	/** Answers given in the period. */
	practiced: number;
	/** Answers that were right without a hint. */
	correct: number;
	sessions: number;
	isMe: boolean;
};

/** Result of sending a friend request or opening an invite link. */
export type FriendOutcome = 'pending' | 'accepted' | 'exists' | 'unknown' | 'self';

/** A set somebody shared (by link or straight to you), validated and ready to be copied. */
export type SharedSet = {
	set: StudySet;
	listCount: number;
	rowCount: number;
	owner: Person;
};

export type IncomingShare = {
	shareId: string;
	title: string;
	subject: string;
	listCount: number;
	rowCount: number;
	sender: Person;
	createdAt: number;
};

/** A set on a profile. `isPublic` is only meaningful on your own profile (friends only get public sets). */
export type ProfileSet = { id: string; title: string; subject: string; listCount: number; rowCount: number; isPublic: boolean; updatedAt: number };

export type ProfileStats = { answers: number; correct: number; sessions: number; tests: number; mastered: number };

/** Own profile or a friend's, as shown on the profile page. `stats` is null when the person keeps them private. */
export type ProfileView = Person & {
	isSelf: boolean;
	/** ms since epoch */
	memberSince: number;
	stats: ProfileStats | null;
	/** End times (ms) of recent practice sessions, newest first; empty when stats are private. */
	activity: number[];
	sets: ProfileSet[];
};

export interface SocialApi {
	getMyProfile(): Promise<MyProfile>;
	updateProfile(changes: { displayName?: string; username?: string; showOnLeaderboard?: boolean }): Promise<MyProfile>;
	/** Stores the (already shrunk) picture as the profile photo. */
	uploadAvatar(image: Blob): Promise<MyProfile>;
	removeAvatar(): Promise<MyProfile>;

	searchPeople(query: string): Promise<FoundPerson[]>;
	sendFriendRequest(personId: string): Promise<FriendOutcome>;
	respondToRequest(personId: string, accept: boolean): Promise<void>;
	/** Cancels a request you sent, or ends a friendship. */
	removeFriendship(personId: string): Promise<void>;
	listFriendships(): Promise<Friendship[]>;

	/** Who is behind an invite link. null when the code does not exist. */
	lookupInvite(code: string): Promise<FoundPerson | null>;
	acceptInvite(code: string): Promise<FriendOutcome>;
	regenerateInviteCode(): Promise<string>;

	/** You and your friends, most practised first. `sinceMs` = start of the week or month. */
	leaderboard(sinceMs: number): Promise<LeaderRow[]>;

	/** The share token of your set, or null while it is not shared by link. */
	getShareToken(setId: string): Promise<string | null>;
	enableShare(setId: string): Promise<string>;
	disableShare(setId: string): Promise<void>;
	getSharedSet(token: string): Promise<SharedSet | null>;
	sendSetToFriend(setId: string, friendId: string): Promise<void>;
	listIncomingShares(): Promise<IncomingShare[]>;
	getIncomingShare(shareId: string): Promise<SharedSet | null>;
	respondToShare(shareId: string, accept: boolean): Promise<void>;

	/** Own profile or a friend's, by username. null when it does not exist or you are not friends. */
	getProfile(username: string): Promise<ProfileView | null>;
	getVisibility(setId: string): Promise<boolean>;
	setVisibility(setId: string, isPublic: boolean): Promise<void>;
	/** A public set of a friend (or your own set), ready to be copied. */
	getPublicSet(setId: string): Promise<SharedSet | null>;
	/** Removes the profile photo and the whole account with everything in it. Cannot be undone. */
	deleteAccount(): Promise<void>;
}
