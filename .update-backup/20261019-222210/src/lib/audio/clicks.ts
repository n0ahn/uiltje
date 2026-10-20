// One quiet click sound for every button, link and switch in the app. A single delegated listener on the
// document, so new components get the sound without any code. Put `data-sfx="off"` on an element (or a parent)
// to silence it, e.g. where another sound plays right after. The sound setting is checked inside playSfx.
import { playSfx } from './sfx';

const TARGET =
	'button, a[href], summary, [role="tab"], [role="menuitem"], [role="switch"], label:has(input[type="radio"]), label:has(input[type="checkbox"])';

export function installClickSounds(): () => void {
	function onClick(event: MouseEvent) {
		if (!event.isTrusted) return; // label clicks forward a synthetic click to the input: only one sound
		const el = (event.target as Element | null)?.closest?.(TARGET);
		if (!el || el.closest('[data-sfx="off"]')) return;
		if (el.matches(':disabled, [aria-disabled="true"]')) return;
		playSfx(el.matches('[aria-haspopup="menu"], summary') ? 'open' : 'click');
	}
	document.addEventListener('click', onClick, true);
	return () => document.removeEventListener('click', onClick, true);
}