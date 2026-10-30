import { IMPORT_SOURCES, type ImportConverterName, type ImportExtraDocs } from '../config';

/** Build filename-keyed extra docs from parsed files in `IMPORT_SOURCES` order (after primary). */
export function buildImportExtraDocs<N extends ImportConverterName>(
	name: N,
	parsedExtrasInSourceOrder: readonly unknown[][],
): ImportExtraDocs<N> {
	const extraNames = IMPORT_SOURCES[name].slice(1);
	const out: Record<string, unknown[]> = {};
	for (let i = 0; i < extraNames.length; i++) {
		const fileName = extraNames[i];
		if (fileName === undefined) {
			continue;
		}
		out[fileName] = parsedExtrasInSourceOrder[i] ?? [];
	}
	return out as ImportExtraDocs<N>;
}

/** Empty extras for every configured secondary source file. */
export function emptyImportExtraDocs<N extends ImportConverterName>(name: N): ImportExtraDocs<N> {
	return buildImportExtraDocs(name, []);
}
