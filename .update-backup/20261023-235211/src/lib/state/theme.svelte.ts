// Theme preference. 'system' follows prefers-color-scheme, any other value is a fixed theme.
// <html data-theme="<id>"> is ALWAYS set (app.html before first paint, then here); the CSS for each theme lives in
// routes/layout.css. The choice is a per-device UI setting (not set/progress data), so it is kept in localStorage
// right here. Keep THEMES in sync with layout.css and with the inline script in app.html.
export type ThemeMode = 'light' | 'dark';
export type ThemeId = 'light' | 'dark' | 'salie' | 'lavendel' | 'zeemist' | 'middernacht' | 'bos';
export type ThemePreference = 'system' | ThemeId;

export type ThemeInfo = { id: ThemeId; name: string; mode: ThemeMode; text: string };

export const THEMES: readonly ThemeInfo[] = [
	{ id: 'light', name: 'Crème', mode: 'light', text: 'Warm en zacht, de standaard.' },
	{ id: 'salie', name: 'Salie', mode: 'light', text: 'Rustig groen, als een kruidentuin.' },
	{ id: 'lavendel', name: 'Lavendel', mode: 'light', text: 'Zacht paars en luchtig.' },
	{ id: 'zeemist', name: 'Zeemist', mode: 'light', text: 'Koel blauw, als een mistige ochtend.' },
	{ id: 'dark', name: 'Cacao', mode: 'dark', text: 'Warm bruin, fijn \'s avonds.' },
	{ id: 'middernacht', name: 'Middernacht', mode: 'dark', text: 'Diepblauw met een zacht licht.' },
	{ id: 'bos', name: 'Bos', mode: 'dark', text: 'Donkergroen, rustig voor je ogen.' }
];

const BY_ID = new Map<string, ThemeInfo>(THEMES.map((t) => [t.id, t]));
const STORAGE_KEY = 'uiltje-theme';
/** Which light and which dark theme "Automatisch" and the quick toggle use: {"light":"salie","dark":"bos"}. */
const PAIR_KEY = 'uiltje-theme-pair';

type Pair = { light: ThemeId; dark: ThemeId };
const isTheme = (value: unknown): value is ThemeId => typeof value === 'string' && BY_ID.has(value);

function readPair(): Pair {
	const pair: Pair = { light: 'light', dark: 'dark' };
	try {
		const saved = JSON.parse(localStorage.getItem(PAIR_KEY) ?? '{}') as Partial<Record<ThemeMode, unknown>>;
		if (isTheme(saved.light) && BY_ID.get(saved.light)?.mode === 'light') pair.light = saved.light;
		if (isTheme(saved.dark) && BY_ID.get(saved.dark)?.mode === 'dark') pair.dark = saved.dark;
	} catch {
		// storage can be blocked or hold junk; use the defaults
	}
	return pair;
}

class ThemeState {
	preference = $state<ThemePreference>('system');
	systemDark = $state(false);
	pair = $state<Pair>({ light: 'light', dark: 'dark' });

	/** The theme that is actually on screen. */
	get resolved(): ThemeId {
		if (this.preference !== 'system') return this.preference;
		return this.systemDark ? this.pair.dark : this.pair.light;
	}

	get mode(): ThemeMode {
		return BY_ID.get(this.resolved)?.mode ?? 'light';
	}

	/** Call once on mount (browser only). Returns a cleanup function. */
	init(): () => void {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (isTheme(saved)) this.preference = saved;
		} catch {
			// storage can be blocked; fall back to the system theme
		}
		this.pair = readPair();
		const query = window.matchMedia('(prefers-color-scheme: dark)');
		this.systemDark = query.matches;
		const onChange = (event: MediaQueryListEvent) => {
			this.systemDark = event.matches;
			this.apply(false);
		};
		query.addEventListener('change', onChange);
		this.apply(false);
		return () => query.removeEventListener('change', onChange);
	}

	/** Puts the resolved theme on <html>, optionally gliding between colors, and tells the phone's browser bar. */
	private apply(animate: boolean): void {
		const root = document.documentElement;
		if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			root.classList.add('theme-fade');
			window.setTimeout(() => root.classList.remove('theme-fade'), 450);
		}
		root.dataset.theme = this.resolved;
		const bar = getComputedStyle(root).getPropertyValue('--color-bg').trim();
		if (bar) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bar);
	}

	set(preference: ThemePreference): void {
		this.preference = preference;
		const info = preference === 'system' ? undefined : BY_ID.get(preference);
		if (info) this.pair = { ...this.pair, [info.mode]: info.id };
		try {
			if (preference === 'system') localStorage.removeItem(STORAGE_KEY);
			else localStorage.setItem(STORAGE_KEY, preference);
			localStorage.setItem(PAIR_KEY, JSON.stringify(this.pair));
		} catch {
			// ignore
		}
		this.apply(true);
	}

	/** Quick light/dark flip: goes to the last light or dark theme you picked. Works before init() ran. */
	toggle(): void {
		if (this.pair.light === 'light' && this.pair.dark === 'dark') this.pair = readPair();
		const shown = document.documentElement.dataset.theme;
		const dark = (isTheme(shown) ? BY_ID.get(shown)?.mode : undefined) === 'dark';
		this.set(dark ? this.pair.light : this.pair.dark);
	}
}

export const theme = new ThemeState();
