import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { IMPORT_LOG_DIR, IMPORT_LOG_SEVERITIES, type ImportLogSeverity } from '../config';
import type { ImportReportLogSections } from './reportHelpers';

/** Resolve the import log directory (`out/log`). */
export function resolveImportLogDir(outDir: string): string {
	return join(outDir, IMPORT_LOG_DIR);
}

/** Filename for one section + severity, e.g. `courses.error.log`. */
function importSectionLogFileName(section: string, severity: ImportLogSeverity): string {
	return `${section}.${severity}.log`;
}

async function writeLogFile(path: string, contents: string): Promise<void> {
	await Bun.write(path, contents);
}

/** Wipe and recreate the log directory so a new CLI run starts clean. */
export async function resetImportLogs(logDir: string): Promise<void> {
	await rm(logDir, { recursive: true, force: true });
	await mkdir(logDir, { recursive: true });
}

/** Write non-empty severity logs for one section (`{section}.error.log`, …). */
export async function writeImportSectionLogs(
	logDir: string,
	section: string,
	sections: ImportReportLogSections,
): Promise<void> {
	await mkdir(logDir, { recursive: true });
	const writes: Promise<void>[] = [];
	for (const severity of IMPORT_LOG_SEVERITIES) {
		const body = sections[severity];
		if (body == null) continue;
		writes.push(writeLogFile(join(logDir, importSectionLogFileName(section, severity)), body));
	}
	await Promise.all(writes);
}
