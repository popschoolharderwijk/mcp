export function importUsage(): string {
	return 'Usage: bun import [--upload]';
}

export type ParseImportCommandResult = { ok: true; upload: boolean } | { ok: false; error: string };

/** Resolve `bun import` or `bun import --upload` (always runs the full pipeline). */
export function parseImportCommand(argv: string[]): ParseImportCommandResult {
	const args = argv.slice(2);

	let upload = false;
	for (const arg of args) {
		if (arg === '--upload') {
			if (upload) {
				return { ok: false, error: importUsage() };
			}
			upload = true;
			continue;
		}
		return { ok: false, error: importUsage() };
	}

	return { ok: true, upload };
}
