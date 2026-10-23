// Types for the notification centre. Pure TS: no Svelte, DOM or Supabase imports.

export type NotificationKind =
	| 'friend-request' // somebody wants to be your friend (live: gone once you answered)
	| 'friend-accepted' // somebody accepted your request
	| 'share' // somebody sent you a set (live: gone once you answered)
	| 'dispute-reply' // the owner handled your "Uitleggen" dispute (live: the last 30 days)
	| 'welcome'
	| 'streak' // streak milestone
	| 'milestone'; // total answers milestone

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
