import { join } from 'node:path';
import { IMPORT_CUTOFF_LOG_SECTION, IMPORT_ID_MAP_FILE, type ImportConverterName } from '../config';
import type { ImportConverter } from './converterTypes';
import { formatImportConverterBanner, importConsoleError, importConsoleLog } from './importConsoleHelpers';
import { formatImportCutoffRemovalLog } from './importCutoffRemovalHelpers';
import { resolveImportLogDir, writeImportSectionLogs } from './importLogHelpers';
import type { ApplyImportSettingsResult } from './loadImportSettingsHelpers';
import { applyImportSettingsFromSource } from './loadImportSettingsHelpers';
import { parseImportCommand } from './parseImportCommandHelpers';
import type { ImportConverterDirs } from './runImportConverter';

export type ImportCliDeps = {
	converterNames: readonly ImportConverterName[];
	converters: Record<ImportConverterName, ImportConverter>;
	preferredSqlOrder: readonly string[];
	resolvePath: (path: string) => string;
	/** Wipe and recreate the out directory when `--clean` is set. */
	cleanOutDir: (outDir: string) => Promise<void>;
	resetImportLogs: (logDir: string) => Promise<void>;
	/** Clear `id-map.json` once at the start of a full pipeline (not between converters). */
	resetIdMap: (path: string) => Promise<void>;
	runImportConverter: (converter: ImportConverter, dirs: ImportConverterDirs) => Promise<void>;
	uploadImportSqlFiles: (params: {
		outDir: string;
		preferredSqlOrder: readonly string[];
		log?: (message: string) => void;
	}) => Promise<{ ok: true; files: string[] } | { ok: false; error: string }>;
	applyImportSettings?: (sourceDir: string) => Promise<ApplyImportSettingsResult>;
	log?: (message: string) => void;
	error?: (message: string) => void;
};

function formatSettingsLog(result: Extract<ApplyImportSettingsResult, { ok: true }>): string {
	const { settings, settingsPath } = result;
	const min = settings.minAgreementEndDate ?? 'null';
	const aliasCanonical = Object.keys(settings.lessonTypeAliases).length;
	const aliasSources = Object.values(settings.lessonTypeAliases).reduce((n, list) => n + list.length, 0);
	return `Settings: minAgreementEndDate=${min}, removeOutdatedStudents=${settings.removeOutdatedStudents}, useLessonTypeAliases=${settings.useLessonTypeAliases}, lessonTypeAliases=${aliasCanonical}→${aliasSources} ← ${settingsPath}`;
}

/** Run `bun import <source> <out> [--clean] [--upload]` (full pipeline) and return a process exit code. */
export async function runImportCli(argv: string[], deps: ImportCliDeps): Promise<number> {
	const log = deps.log ?? importConsoleLog;
	const error = deps.error ?? importConsoleError;
	const applySettings = deps.applyImportSettings ?? applyImportSettingsFromSource;

	const parsed = parseImportCommand(argv);
	if (!parsed.ok) {
		error(parsed.error);
		return 1;
	}

	const dirs: ImportConverterDirs = {
		sourceDir: deps.resolvePath(parsed.source),
		outDir: deps.resolvePath(parsed.out),
	};
	const logDir = resolveImportLogDir(dirs.outDir);

	const settingsResult = await applySettings(dirs.sourceDir);
	if (!settingsResult.ok) {
		error(settingsResult.error);
		return 1;
	}
	log(formatSettingsLog(settingsResult));

	if (parsed.clean) {
		await deps.cleanOutDir(dirs.outDir);
		log(`Cleaned ${dirs.outDir}`);
	}

	const mapPath = join(dirs.outDir, IMPORT_ID_MAP_FILE);
	await deps.resetImportLogs(logDir);
	const cutoffLog = formatImportCutoffRemovalLog(settingsResult.settings, settingsResult.cutoffRemovals);
	if (cutoffLog != null) {
		await writeImportSectionLogs(logDir, IMPORT_CUTOFF_LOG_SECTION, cutoffLog);
	}
	await deps.resetIdMap(mapPath);
	log(`Reset ${IMPORT_ID_MAP_FILE}`);
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
		log,
	});
	if (!result.ok) {
		error(result.error);
		return 1;
	}
	log(`Uploaded: ${result.files.join(', ')}`);
	return 0;
}
