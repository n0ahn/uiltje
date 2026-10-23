export type Greeting = { text: string; icon: 'sun' | 'moon' };

/** Dutch greeting by hour (0-23). `null` (before the browser clock is known) gives a neutral one. */
export function greetingFor(hour: number | null): Greeting {
	if (hour === null) return { text: 'Welkom terug', icon: 'sun' };
	if (hour >= 5 && hour < 12) return { text: 'Goedemorgen', icon: 'sun' };
	if (hour >= 12 && hour < 18) return { text: 'Goedemiddag', icon: 'sun' };
	if (hour >= 18 && hour < 23) return { text: 'Goedenavond', icon: 'moon' };
	return { text: 'Hallo', icon: 'moon' };
}