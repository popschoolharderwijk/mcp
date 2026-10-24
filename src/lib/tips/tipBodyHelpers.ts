/** Split tip body on `{{…}}` tokens. Plain tokens → kbd; `icon:name` → inline icon. */
export type TipBodyPart =
	| { key: string; type: 'text'; value: string }
	| { key: string; type: 'key'; value: string }
	| { key: string; type: 'icon'; value: string };

const TOKEN = /\{\{([^}]+)\}\}/g;
const ICON_PREFIX = 'icon:';

export function parseTipBody(body: string): TipBodyPart[] {
	const parts: TipBodyPart[] = [];
	let lastIndex = 0;
	let partIndex = 0;
	for (const match of body.matchAll(TOKEN)) {
		const index = match.index ?? 0;
		if (index > lastIndex) {
			parts.push({ key: `t${partIndex}`, type: 'text', value: body.slice(lastIndex, index) });
			partIndex += 1;
		}
		const raw = match[1];
		if (raw.startsWith(ICON_PREFIX)) {
			parts.push({ key: `i${partIndex}`, type: 'icon', value: raw.slice(ICON_PREFIX.length) });
		} else {
			parts.push({ key: `k${partIndex}`, type: 'key', value: raw });
		}
		partIndex += 1;
		lastIndex = index + match[0].length;
	}
	if (lastIndex < body.length) {
		parts.push({ key: `t${partIndex}`, type: 'text', value: body.slice(lastIndex) });
	}
	return parts;
}
