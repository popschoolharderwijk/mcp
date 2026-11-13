// Matches public.slugify(text). Blank input stays '' here; SQL returns NULL for the same case.

const FROM = 'áàäâãåéèëêíìïîóòöôõúùüûýÿçñ';
const TO = 'aaaaaaeeeeiiiiooooouuuuyycn';

export function slugify(value: string): string {
	const lowered = value.toLowerCase();
	let translated = '';
	for (const ch of lowered) {
		const index = FROM.indexOf(ch);
		translated += index >= 0 ? TO[index] : ch;
	}
	return translated.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function isValidSlug(slug: string): boolean {
	return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
