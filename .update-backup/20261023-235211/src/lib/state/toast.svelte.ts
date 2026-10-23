// Toast queue. Usage: `toasts.show('Opgeslagen')`.
export type ToastMessage = { id: number; text: string; /** Makes the toast a link. */ href?: string };

class ToastState {
	items = $state<ToastMessage[]>([]);
	#nextId = 1;

	show(text: string, durationMs = 3000, href?: string): void {
		const id = this.#nextId++;
		this.items.push({ id, text, href });
		setTimeout(() => this.dismiss(id), durationMs);
	}

	dismiss(id: number): void {
		this.items = this.items.filter((t) => t.id !== id);
	}
}

export const toasts = new ToastState();