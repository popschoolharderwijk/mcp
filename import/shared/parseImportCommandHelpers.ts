import type { ImportConverterName } from '../config';

export function importUsage(converterNames: readonly ImportConverterName[]): string {
	return `Usage: bun import <all|${converterNames.join('|')}> [--upload]\n       bun import --upload`;
}

export type ParseImportCommandResult =
	| { ok: true; names: ImportConverterName[]; upload: boolean }
	| { ok: false; error: string };

/** Resolve `bun import <all|name> [--upload]` or `bun import --upload`. */
export function parseImportCommand(
	argv: string[],
	converterNames: readonly ImportConverterName[],
): ParseImportCommandResult {
	const args = argv.slice(2);
	const allowed = new Set<string>(converterNames);

	let upload = false;
	const positional: string[] = [];
	for (const arg of args) {
		if (arg === '--upload') {
			if (upload) {
				return { ok: false, error: importUsage(converterNames) };
			}
			upload = true;
			continue;
		}
		if (arg.startsWith('-')) {
			return { ok: false, error: importUsage(converterNames) };
		}
		positional.push(arg);
	}

	if (positional.length === 0) {
		if (!upload) {
			return { ok: false, error: importUsage(converterNames) };
		}
		return { ok: true, names: [], upload: true };
	}

	if (positional.length !== 1) {
		return { ok: false, error: importUsage(converterNames) };
	}

	const name = positional[0];
	if (name === 'all') {
		return { ok: true, names: [...converterNames], upload };
	}

	if (!allowed.has(name)) {
		return { ok: false, error: importUsage(converterNames) };
	}

	return { ok: true, names: [name as ImportConverterName], upload };
}
