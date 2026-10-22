const XML_ESCAPE_MAP: Record<string, string> = {
	'<': '&lt;',
	'>': '&gt;',
	'&': '&amp;',
	"'": '&apos;',
	'"': '&quot;',
};

export function escapeXmlChar(char: string): string {
	return XML_ESCAPE_MAP[char];
}

export function xmlEscape(s: string): string {
	return s.replace(/[<>&'"]/g, (char) => escapeXmlChar(char));
}

export function fmtAmount(cents: number): string {
	return (cents / 100).toFixed(2);
}
