/** Local wall clock `HH:mm:ss` for CLI/console log lines. */
export function formatConsoleClock(now: Date = new Date()): string {
	const hours = String(now.getHours()).padStart(2, '0');
	const minutes = String(now.getMinutes()).padStart(2, '0');
	const seconds = String(now.getSeconds()).padStart(2, '0');
	return `${hours}:${minutes}:${seconds}`;
}

/** Prefix every non-empty line with `[HH:mm:ss]`. */
export function prefixConsoleLines(message: string, now: Date = new Date()): string {
	const stamp = `[${formatConsoleClock(now)}]`;
	return message
		.split('\n')
		.map((line) => (line.length === 0 ? '' : `${stamp} ${line}`))
		.join('\n');
}
