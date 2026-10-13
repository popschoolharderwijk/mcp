/**
 * Legacy Mongo import dispatcher.
 *
 * Usage:
 *   bun import teachers
 *   bun import courses
 *   bun import all
 */

import { IMPORT_CONVERTER_NAMES, IMPORT_CONVERTERS } from './converters';
import { formatImportConverterBanner } from './shared/importConsoleHelpers';
import { parseImportCommand } from './shared/parseImportCommandHelpers';
import { runImportConverter } from './shared/runImportConverter';

async function main(): Promise<void> {
	const parsed = parseImportCommand(process.argv, IMPORT_CONVERTER_NAMES);
	if (!parsed.ok) {
		console.error(parsed.error);
		process.exit(1);
	}

	for (const [index, name] of parsed.names.entries()) {
		console.log(formatImportConverterBanner(name, index));
		await runImportConverter(IMPORT_CONVERTERS[name]);
	}
}

await main();
