/**
 * Legacy Mongo import (full pipeline).
 *
 * Usage:
 *   bun import <source> <out>
 *   bun import <source> <out> --upload
 *
 * Each run resets `id-map.json` once at the start, then converters rebuild it in order.
 *
 * Required `import/settings.json`:
 *   minAgreementEndDate — null | YYYY-MM-DD
 *   removeOutdatedStudents — boolean
 *   useLessonTypeAliases — boolean (master switch for lessonTypeAliases)
 *   lessonTypeAliases — canonical name → Mongo course names (when useLessonTypeAliases)
 */

import { resolve } from 'node:path';
import { IMPORT_OUTPUTS } from './config';
import { IMPORT_CONVERTER_NAMES, IMPORT_CONVERTERS } from './converters';
import { resetIdMap } from './shared/idMapFile';
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
	resetIdMap,
	runImportConverter,
	uploadImportSqlFiles,
});

process.exit(exitCode);
