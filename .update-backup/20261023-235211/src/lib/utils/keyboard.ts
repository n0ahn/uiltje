// Svelte action: converts what is typed into an input to Greek letters when `enabled` (see engine/greek.ts).
// It listens in the capture phase, so the converted value is in place before `bind:value` / `oninput` read it.
import { toGreek } from '../engine/greek';

export function greekKeyboard(node: HTMLInputElement | HTMLTextAreaElement, enabled: boolean) {
	let on = enabled;

	function convert(event: Event) {
		if (!on || (event as InputEvent).isComposing) return;
		const before = node.value;
		const after = toGreek(before);
		if (after === before) return;
		const caret = node.selectionStart;
		node.value = after;
		if (caret !== null && document.activeElement === node) {
			const position = toGreek(before.slice(0, caret)).length;
			node.setSelectionRange(position, position);
		}
	}

	node.addEventListener('input', convert, true);
	return {
		update(next: boolean) {
			on = next;
		},
		destroy() {
			node.removeEventListener('input', convert, true);
		}
	};
}
