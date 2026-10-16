export function importUsage(): string {
	return 'Usage: bun import <source> <out> [--upload]';
}

export type ParseImportCommandResult =
	| { ok: true; source: string; out: string; upload: boolean }
	| { ok: false; error: string };

/** Resolve `bun import <source> <out> [--upload]` (always runs the full pipeline). */
export function parseImportCommand(argv: string[]): ParseImportCommandResult {
	const args = argv.slice(2);

	let upload = false;
	const positionals: string[] = [];
	for (const arg of args) {
		if (arg === '--upload') {
			if (upload) {
				return { ok: false, error: importUsage() };
			}
			upload = true;
			continue;
		}
		if (arg.startsWith('-')) {
			return { ok: false, error: importUsage() };
		}
		positionals.push(arg);
	}

	if (positionals.length !== 2) {
		return { ok: false, error: importUsage() };
	}

	const [source, out] = positionals;
	return { ok: true, source, out, upload };
}
