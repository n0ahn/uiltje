/** Fresh unique id for sets, lists and rows. Always a UUID: Supabase columns are typed uuid. */
export function newId(): string {
	if (typeof crypto !== 'undefined') {
		if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
		// randomUUID only exists in secure contexts (https, localhost); a phone on http://192.168.x.x lacks it.
		if (typeof crypto.getRandomValues === 'function') {
			const b = crypto.getRandomValues(new Uint8Array(16));
			b[6] = (b[6]! & 0x0f) | 0x40;
			b[8] = (b[8]! & 0x3f) | 0x80;
			const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
			return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
		}
	}
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = Math.floor(Math.random() * 16);
		return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
	});
}
