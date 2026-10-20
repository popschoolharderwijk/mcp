export function fmtEUR(cents: number): string {
	return (cents / 100).toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' });
}

export function fmtDateNL(iso: string): string {
	const d = new Date(iso);
	return d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function wrap(text: string, max: number): string[] {
	const words = text.split(' ');
	const out: string[] = [];
	let cur = '';
	for (const w of words) {
		if ((cur + ' ' + w).trim().length > max) {
			if (cur) out.push(cur);
			cur = w;
		} else {
			cur = (cur + ' ' + w).trim();
		}
	}
	if (cur) out.push(cur);
	return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
	let bin = '';
	for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
	return btoa(bin);
}
