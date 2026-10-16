/**
 * Legacy Mongo import (full pipeline).
 *
 * Usage:
 *   bun import <source> <out>
 *   bun import <source> <out> --upload
 */

import { resolve } from 'node:path';
import { IMPORT_OUTPUTS } from './config';
import { IMPORT_CONVERTER_NAMES, IMPORT_CONVERTERS } from './converters';
import { runImportCli } from './shared/importCliHelpers';
import { resetImportLog } from './shared/importLogHelpers';
import { runImportConverter } from './shared/runImportConverter';
import { uploadImportSqlFiles } from './shared/uploadImportSqlHelpers';

const exitCode = await runImportCli(process.argv, {
	converterNames: IMPORT_CONVERTER_NAMES,
	converters: IMPORT_CONVERTERS,
	preferredSqlOrder: Object.values(IMPORT_OUTPUTS),
	resolvePath: resolve,
	resetImportLog,
	runImportConverter,
	uploadImportSqlFiles,
});

process.exit(exitCode);
