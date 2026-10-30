const ANSI = {
	reset: '\x1b[0m',
	bold: '\x1b[1m',
	dim: '\x1b[2m',
	cyan: '\x1b[36m',
	magenta: '\x1b[35m',
	yellow: '\x1b[33m',
	green: '\x1b[32m',
	blue: '\x1b[34m',
} as const;

const CONVERTER_COLORS = [ANSI.cyan, ANSI.magenta, ANSI.yellow, ANSI.green, ANSI.blue] as const;

function wrap(text: string, codes: string[], useColor: boolean): string {
	if (!useColor) return text;
	return `${codes.join('')}${text}${ANSI.reset}`;
}

/** Local wall clock `HH:mm:ss` for import console lines. */
function formatImportConsoleClock(now: Date = new Date()): string {
	const hours = String(now.getHours()).padStart(2, '0');
	const minutes = String(now.getMinutes()).padStart(2, '0');
	const seconds = String(now.getSeconds()).padStart(2, '0');
	return `${hours}:${minutes}:${seconds}`;
}

/** Prefix every non-empty line with `[HH:mm:ss]`. */
export function prefixImportConsoleLines(message: string, now: Date = new Date()): string {
	const stamp = `[${formatImportConsoleClock(now)}]`;
	return message
		.split('\n')
		.map((line) => (line.length === 0 ? '' : `${stamp} ${line}`))
		.join('\n');
}

/** Default stdout writer for `bun import` (timestamped). */
export function importConsoleLog(message: string): void {
	console.log(prefixImportConsoleLines(message));
}

/** Default stderr writer for `bun import` (timestamped). */
export function importConsoleError(message: string): void {
	console.error(prefixImportConsoleLines(message));
}

/** Colored banner so converters are visually separated in `bun import`. */
export function formatImportConverterBanner(
	name: string,
	index = 0,
	useColor: boolean = Boolean(process.stdout.isTTY),
): string {
	const color = CONVERTER_COLORS[index % CONVERTER_COLORS.length] ?? ANSI.cyan;
	const title = wrap(` ${name} `, [color, ANSI.bold], useColor);
	const rule = wrap('═'.repeat(48), [color, ANSI.dim], useColor);
	return `\n${rule}\n${title}\n${rule}`;
}
