// Types for the notification centre. Pure TS: no Svelte, DOM or Supabase imports.

export type NotificationKind =
	| 'friend-request' // somebody wants to be your friend (live: gone once you answered)
	| 'friend-accepted' // somebody accepted your request
	| 'share' // somebody sent you a set (live: gone once you answered)
	| 'welcome'
	| 'weetje' // learning fact
	| 'motivatie'
	| 'streak' // streak milestone
	| 'streak-risk' // streak is about to end today
	| 'milestone' // total answers milestone
	| 'welcome-back';

export type AppNotification = {
	/** Stable, so read state survives reloads. */
	id: string;
	kind: NotificationKind;
	title: string;
	text: string;
	/** ms since epoch */
	createdAt: number;
	/** Where a click goes. */
	href?: string;
	/** Social notifications show the person's avatar. */
	person?: { name: string; avatarUrl: string | null };
	/** Live notifications mirror the server (open requests, shares) and are not stored on the device. */
	live?: boolean;
};

/** A learning fact or motivating line, shown one per day (and a few on the very first visit). */
export type TipContent = { kind: 'weetje' | 'motivatie'; title: string; text: string };
