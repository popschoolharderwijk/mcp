import type { ImportConverterName } from '../config';
import type { ImportConverter } from './converterTypes';
import { formatImportConverterBanner } from './importConsoleHelpers';
import { parseImportCommand } from './parseImportCommandHelpers';

export type ImportCliDeps = {
	converterNames: readonly ImportConverterName[];
	converters: Record<ImportConverterName, ImportConverter>;
	logPath: string;
	outDir: string;
	preferredSqlOrder: readonly string[];
	resolvePath: (path: string) => string;
	resetImportLog: (path: string) => Promise<void>;
	runImportConverter: (converter: ImportConverter) => Promise<void>;
	uploadImportSqlFiles: (params: {
		outDir: string;
		preferredSqlOrder: readonly string[];
	}) => Promise<{ ok: true; files: string[] } | { ok: false; error: string }>;
	log?: (message: string) => void;
	error?: (message: string) => void;
};

/** Run `bun import …` and return a process exit code. */
export async function runImportCli(argv: string[], deps: ImportCliDeps): Promise<number> {
	const log = deps.log ?? console.log;
	const error = deps.error ?? console.error;

	const parsed = parseImportCommand(argv, deps.converterNames);
	if (!parsed.ok) {
		error(parsed.error);
		return 1;
	}

	if (parsed.names.length > 0) {
		await deps.resetImportLog(deps.resolvePath(deps.logPath));
		for (const [index, name] of parsed.names.entries()) {
			log(formatImportConverterBanner(name, index, false));
			await deps.runImportConverter(deps.converters[name]);
		}
	}

	if (!parsed.upload) {
		return 0;
	}

	const result = await deps.uploadImportSqlFiles({
		outDir: deps.resolvePath(deps.outDir),
		preferredSqlOrder: deps.preferredSqlOrder,
	});
	if (!result.ok) {
		error(result.error);
		return 1;
	}
	log(`Uploaded: ${result.files.join(', ')}`);
	return 0;
}
