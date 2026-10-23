/** "zojuist", "5 min geleden", "2 u geleden", "gisteren", "3 dagen geleden", or a date after two weeks. */
export function timeAgo(ms: number, now: number = Date.now()): string {
	const seconds = Math.max(0, Math.round((now - ms) / 1000));
	if (seconds < 60) return 'zojuist';
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes} min geleden`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} u geleden`;
	const days = Math.floor(hours / 24);
	if (days === 1) return 'gisteren';
	if (days < 14) return `${days} dagen geleden`;
	return new Date(ms).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}
