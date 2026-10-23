// Open/closed state of the command palette. Anything can open it: `palette.show()`.
class PaletteState {
	open = $state(false);

	show(): void {
		this.open = true;
	}

	hide(): void {
		this.open = false;
	}

	toggle(): void {
		this.open = !this.open;
	}
}

export const palette = new PaletteState();