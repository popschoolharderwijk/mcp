import type { ImportConverterName } from '../config';

export function importUsage(converterNames: readonly ImportConverterName[]): string {
	return `Usage: bun import <all|${converterNames.join('|')}>`;
}

export type ParseImportCommandResult = { ok: true; names: ImportConverterName[] } | { ok: false; error: string };

/** Resolve `bun import <all|name>` with no further args. */
export function parseImportCommand(
	argv: string[],
	converterNames: readonly ImportConverterName[],
): ParseImportCommandResult {
	const name = argv[2];
	const rest = argv.slice(3);
	const allowed = new Set<string>(converterNames);

	if (!name || rest.length > 0) {
		return { ok: false, error: importUsage(converterNames) };
	}

	if (name === 'all') {
		return { ok: true, names: [...converterNames] };
	}

	if (!allowed.has(name)) {
		return { ok: false, error: importUsage(converterNames) };
	}

	return { ok: true, names: [name as ImportConverterName] };
}
