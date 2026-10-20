/** True on macOS and iOS/iPadOS (where the shortcut modifier is Command, shown as ⌘). Browser only. */
export function isApplePlatform(): boolean {
	const ua = navigator.userAgent;
	// iPadOS reports itself as "Macintosh", which is fine: it also uses Command.
	return /Mac|iPhone|iPad|iPod/i.test(ua);
}