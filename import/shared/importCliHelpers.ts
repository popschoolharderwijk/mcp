import { join } from 'node:path';
import { IMPORT_LOG_FILE, type ImportConverterName } from '../config';
import type { ImportConverter } from './converterTypes';
import { formatImportConverterBanner } from './importConsoleHelpers';
import { parseImportCommand } from './parseImportCommandHelpers';
import type { ImportConverterDirs } from './runImportConverter';

export type ImportCliDeps = {
	converterNames: readonly ImportConverterName[];
	converters: Record<ImportConverterName, ImportConverter>;
	preferredSqlOrder: readonly string[];
	resolvePath: (path: string) => string;
	resetImportLog: (path: string) => Promise<void>;
	runImportConverter: (converter: ImportConverter, dirs: ImportConverterDirs) => Promise<void>;
	uploadImportSqlFiles: (params: {
		outDir: string;
		preferredSqlOrder: readonly string[];
	}) => Promise<{ ok: true; files: string[] } | { ok: false; error: string }>;
	log?: (message: string) => void;
	error?: (message: string) => void;
};

/** Run `bun import <source> <out> [--upload]` (full pipeline) and return a process exit code. */
export async function runImportCli(argv: string[], deps: ImportCliDeps): Promise<number> {
	const log = deps.log ?? console.log;
	const error = deps.error ?? console.error;

	const parsed = parseImportCommand(argv);
	if (!parsed.ok) {
		error(parsed.error);
		return 1;
	}

	const dirs: ImportConverterDirs = {
		sourceDir: deps.resolvePath(parsed.source),
		outDir: deps.resolvePath(parsed.out),
	};
	const logPath = join(dirs.outDir, IMPORT_LOG_FILE);

	await deps.resetImportLog(logPath);
	for (const [index, name] of deps.converterNames.entries()) {
		log(formatImportConverterBanner(name, index, false));
		await deps.runImportConverter(deps.converters[name], dirs);
	}

	if (!parsed.upload) {
		return 0;
	}

	const result = await deps.uploadImportSqlFiles({
		outDir: dirs.outDir,
		preferredSqlOrder: deps.preferredSqlOrder,
	});
	if (!result.ok) {
		error(result.error);
		return 1;
	}
	log(`Uploaded: ${result.files.join(', ')}`);
	return 0;
}
