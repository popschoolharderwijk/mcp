/**
 * Legacy Mongo import dispatcher.
 *
 * Usage:
 *   bun import teachers
 *   bun import all
 */

import { IMPORT_CONVERTER_NAMES, IMPORT_CONVERTERS } from './converters';
import { parseImportCommand } from './shared/parseImportCommandHelpers';
import { runImportConverter } from './shared/runImportConverter';

async function main(): Promise<void> {
	const parsed = parseImportCommand(process.argv, IMPORT_CONVERTER_NAMES);
	if (!parsed.ok) {
		console.error(parsed.error);
		process.exit(1);
	}

	for (const name of parsed.names) {
		await runImportConverter(IMPORT_CONVERTERS[name]);
	}
}

await main();
