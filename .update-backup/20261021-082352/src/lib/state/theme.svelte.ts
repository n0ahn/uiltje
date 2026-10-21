// Theme preference: 'system' follows prefers-color-scheme, 'light'/'dark' force it via <html data-theme>.
// The preference is a per-device UI setting (not set/progress data), so it is kept in localStorage right here.
// app.html applies a saved choice before first paint to avoid a flash.
export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'uiltje-theme';

class ThemeState {
	preference = $state<ThemePreference>('system');
	systemDark = $state(false);

	get resolved(): 'light' | 'dark' {
		if (this.preference === 'system') return this.systemDark ? 'dark' : 'light';
		return this.preference;
	}

	/** Call once on mount (browser only). Returns a cleanup function. */
	init(): () => void {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved === 'light' || saved === 'dark') this.preference = saved;
		} catch {
			// storage can be blocked; fall back to the system theme
		}
		const query = window.matchMedia('(prefers-color-scheme: dark)');
		this.systemDark = query.matches;
		const onChange = (event: MediaQueryListEvent) => (this.systemDark = event.matches);
		query.addEventListener('change', onChange);
		return () => query.removeEventListener('change', onChange);
	}

	set(preference: ThemePreference): void {
		this.preference = preference;
		const root = document.documentElement;
		if (preference === 'system') delete root.dataset.theme;
		else root.dataset.theme = preference;
		try {
			if (preference === 'system') localStorage.removeItem(STORAGE_KEY);
			else localStorage.setItem(STORAGE_KEY, preference);
		} catch {
			// ignore
		}
	}

	toggle(): void {
		this.set(this.resolved === 'dark' ? 'light' : 'dark');
	}
}

export const theme = new ThemeState();