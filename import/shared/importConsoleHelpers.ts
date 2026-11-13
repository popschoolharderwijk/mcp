import { prefixConsoleLines } from '../../src/lib/time/consoleClockHelpers';

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

/** Default stdout writer for `bun import` (timestamped). */
export function importConsoleLog(message: string): void {
	console.log(prefixConsoleLines(message));
}

/** Default stderr writer for `bun import` (timestamped). */
export function importConsoleError(message: string): void {
	console.error(prefixConsoleLines(message));
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
