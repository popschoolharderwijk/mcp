const IBAN_STRUCTURE_RE = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;

export function normalizeIban(input: string): string {
	return input.replace(/\s+/g, '').toUpperCase();
}

export function isValidIban(input: string): boolean {
	const iban = normalizeIban(input);
	if (!IBAN_STRUCTURE_RE.test(iban)) return false;
	const rearranged = iban.slice(4) + iban.slice(0, 4);
	const numeric = rearranged
		.split('')
		.map((c) => (c >= 'A' && c <= 'Z' ? (c.charCodeAt(0) - 55).toString() : c))
		.join('');
	let remainder = 0;
	for (let i = 0; i < numeric.length; i += 7) {
		const chunk = remainder.toString() + numeric.slice(i, i + 7);
		remainder = Number(chunk) % 97;
	}
	return remainder === 1;
}
