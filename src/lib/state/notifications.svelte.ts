// Notification centre. Two sources, merged into one list:
//  - live: what the server says right now (open friend requests, sets sent to you). They disappear once handled.
//  - local: kept on this device (welcome, streak and answer milestones, accepted requests). No tips or motivational lines.
// Read state is kept per person (account id, or "guest"). Everything refreshes every minute while the tab is
// visible, when the tab gets focus again and after navigating (throttled). No server changes are needed.
import { streakDays } from '../stats/stats';
import { getStorage } from '../storage';
import { getSocial } from '../social';
import { ANSWER_MILESTONES, STREAK_MILESTONES, WELCOME, answersNotice, streakNotice } from '../notifications/content';
import type { AppNotification } from '../notifications/types';
import { toasts } from './toast.svelte';

const DAY = 24 * 60 * 60 * 1000;
const MAX_LOCAL = 40;
const KEEP_MS = 45 * DAY;
const POLL_MS = 60_000;
const NETWORK_THROTTLE_MS = 15_000;
const ACTIVITY_THROTTLE_MS = 2 * 60_000; // reading all sessions is the heaviest call
/** Kinds that are still produced; older stored tips, welcomes and reminders are dropped when read. */
const WELCOMED_KEY = 'uiltje:notif:welcomed'; // per device
const KEPT_KINDS = new Set<AppNotification['kind']>(['welcome', 'friend-accepted', 'streak', 'milestone']);

function read<T>(key: string, fallback: T): T {
	try {
		const raw = localStorage.getItem(key);
		return raw === null ? fallback : (JSON.parse(raw) as T);
	} catch {
		return fallback;
	}
}

function write(key: string, value: unknown): void {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Storage full or blocked: notifications just will not persist.
	}
}

class NotificationState {
	items = $state<AppNotification[]>([]);
	#readIds = $state<string[]>([]);
	loaded = $state(false);

	#userId: string | null = null;
	#started = false;
	#generation = 0;
	#lastNetwork = 0;
	#lastActivity = 0;
	#timer: ReturnType<typeof setInterval> | null = null;

	get unread(): number {
		return this.items.filter((n) => !this.#readIds.includes(n.id)).length;
	}

	isRead(id: string): boolean {
		return this.#readIds.includes(id);
	}

	/** Called by the root layout on first load and after every login or logout. */
	start(userId: string | null): void {
		this.#userId = userId;
		this.#generation++;
		this.items = [];
		this.loaded = false;
		this.#readIds = read<string[]>(this.#key('read'), []);
		this.#lastNetwork = 0;
		this.#lastActivity = 0;
		if (!this.#started) {
			this.#started = true;
			this.#timer = setInterval(() => {
				if (document.visibilityState === 'visible') void this.refresh(true);
			}, POLL_MS);
			document.addEventListener('visibilitychange', this.#onVisible);
		}
		void this.refresh(true);
	}

	stop(): void {
		if (this.#timer) clearInterval(this.#timer);
		this.#timer = null;
		if (this.#started) document.removeEventListener('visibilitychange', this.#onVisible);
		this.#started = false;
	}

	#onVisible = (): void => {
		if (document.visibilityState === 'visible') void this.refresh();
	};

	markRead(id: string): void {
		if (this.#readIds.includes(id)) return;
		this.#readIds = [...this.#readIds, id];
		this.#saveRead();
	}

	markAllRead(): void {
		const all = new Set([...this.#readIds, ...this.items.map((n) => n.id)]);
		this.#readIds = [...all];
		this.#saveRead();
	}

	#key(name: string): string {
		return `uiltje:notif:${name}:${this.#userId ?? 'guest'}`;
	}

	#saveRead(): void {
		// Keep the list from growing forever: only ids that still exist, plus the newest ones.
		write(this.#key('read'), this.#readIds.slice(-300));
	}

	/** Reload everything. Without `force` the network part is skipped when it ran a few seconds ago. */
	async refresh(force = false): Promise<void> {
		if (!this.#started) return;
		const generation = this.#generation;
		const now = Date.now();
		const network = force || now - this.#lastNetwork > NETWORK_THROTTLE_MS;
		if (network) this.#lastNetwork = now;

		const stored = this.#loadLocal(now);
		const announce: AppNotification[] = [];
		this.#addWelcome(stored, now, announce);

		let live: AppNotification[] | null = null;
		if (network) {
			if (now - this.#lastActivity > ACTIVITY_THROTTLE_MS) {
				this.#lastActivity = now;
				await this.#addActivity(stored, now);
			}
			if (this.#userId) live = await this.#loadLive(stored, announce);
		}
		if (generation !== this.#generation) return;

		this.#saveLocal(stored);
		const keepLive = live ?? this.items.filter((n) => n.live);
		this.items = [...keepLive, ...stored].sort((a, b) => b.createdAt - a.createdAt);
		this.loaded = true;
		this.#announce(announce);
	}

	// ---- local notifications

	#loadLocal(now: number): AppNotification[] {
		return read<AppNotification[]>(this.#key('items'), []).filter((n) => KEPT_KINDS.has(n.kind) && now - n.createdAt < KEEP_MS);
	}

	#saveLocal(list: AppNotification[]): void {
		list.sort((a, b) => b.createdAt - a.createdAt);
		write(this.#key('items'), list.slice(0, MAX_LOCAL));
	}

	#add(list: AppNotification[], note: AppNotification): boolean {
		if (list.some((n) => n.id === note.id)) return false;
		list.push(note);
		return true;
	}

	/** First visit on this device: one welcome, nothing else. */
	#addWelcome(list: AppNotification[], now: number, announce: AppNotification[]): void {
		if (read<boolean>(WELCOMED_KEY, false)) return;
		write(WELCOMED_KEY, true);
		const welcome: AppNotification = { id: 'welcome', kind: 'welcome', title: WELCOME.title, text: WELCOME.text, createdAt: now };
		this.#add(list, welcome);
		announce.push(welcome);
	}

	/** Streak and answer milestones. */
	async #addActivity(list: AppNotification[], now: number): Promise<void> {
		try {
			const sessions = await getStorage().listSessions(0);
			const streak = streakDays(sessions, now);

			const reached = [...STREAK_MILESTONES].filter((m) => m <= streak).pop();
			if (reached !== undefined) this.#add(list, { id: `streak:${reached}`, kind: 'streak', ...streakNotice(reached), createdAt: now });

			const total = sessions.reduce((sum, s) => sum + s.total, 0);
			const answers = [...ANSWER_MILESTONES].filter((m) => m <= total).pop();
			if (answers !== undefined) this.#add(list, { id: `answers:${answers}`, kind: 'milestone', ...answersNotice(answers), createdAt: now });
		} catch {
			// Sessions could not be read (offline, storage error): skip the milestones this round.
		}
	}

	// ---- live notifications (account only)

	async #loadLive(stored: AppNotification[], announce: AppNotification[]): Promise<AppNotification[] | null> {
		try {
			const social = getSocial();
			const [friendships, shares] = await Promise.all([social.listFriendships(), social.listIncomingShares()]);
			const live: AppNotification[] = [];

			for (const f of friendships) {
				if (f.status === 'pending' && f.incoming) {
					live.push({
						id: `fr:${f.id}:${f.createdAt}`,
						kind: 'friend-request',
						title: `${f.displayName} wil vrienden worden`,
						text: `@${f.username} heeft je een vriendschapsverzoek gestuurd.`,
						createdAt: f.createdAt,
						href: '/friends',
						person: { name: f.displayName, avatarUrl: f.avatarUrl },
						live: true
					});
				}
			}
			for (const s of shares) {
				live.push({
					id: `sh:${s.shareId}`,
					kind: 'share',
					title: `${s.sender.displayName} deelde een set met je`,
					text: `"${s.title}" met ${s.rowCount} ${s.rowCount === 1 ? 'onderdeel' : 'onderdelen'}.`,
					createdAt: s.createdAt,
					href: `/gedeeld/${s.shareId}`,
					person: { name: s.sender.displayName, avatarUrl: s.sender.avatarUrl },
					live: true
				});
			}

			// Somebody accepted a request you sent: they were in your outgoing list last time and are friends now.
			const outKey = this.#key('pending-out');
			const previousOut = read<string[]>(outKey, []);
			for (const f of friendships) {
				if (f.status === 'accepted' && previousOut.includes(f.id)) {
					const note: AppNotification = {
						id: `fa:${f.id}`,
						kind: 'friend-accepted',
						title: `${f.displayName} is nu je vriend`,
						text: 'Jullie staan nu samen op de ranglijst. Je kunt ook sets met elkaar delen.',
						createdAt: Date.now(),
						href: '/leaderboard',
						person: { name: f.displayName, avatarUrl: f.avatarUrl }
					};
					if (this.#add(stored, note)) announce.push(note);
				}
			}
			write(outKey, friendships.filter((f) => f.status === 'pending' && !f.incoming).map((f) => f.id));

			// Announce open requests and shares once per device, so a new one shows up as a toast.
			const seenKey = this.#key('announced');
			const seen = read<string[]>(seenKey, []);
			for (const n of live) if (!seen.includes(n.id)) announce.push(n);
			write(seenKey, [...new Set([...seen, ...live.map((n) => n.id)])].slice(-200));
			return live;
		} catch {
			return null; // keep what is shown
		}
	}

	// ---- toast for new things

	#announce(fresh: AppNotification[]): void {
		if (fresh.length === 0) return;
		if (fresh.length === 1) {
			const n = fresh[0]!;
			toasts.show(n.kind === 'welcome' ? 'Welkom bij Uiltje' : n.title, 4500, n.href);
		} else {
			// Several at once: if they all go to the same page (e.g. friend requests), the toast links there.
			const hrefs = new Set(fresh.map((n) => n.href));
			const [only] = hrefs;
			toasts.show(`${fresh.length} nieuwe meldingen`, 4500, hrefs.size === 1 ? only : undefined);
		}
	}
}

export const notifications = new NotificationState();
