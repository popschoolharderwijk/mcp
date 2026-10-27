import { join } from 'node:path';
import { IMPORT_ID_MAP_FILE, IMPORT_LOG_FILE, type ImportConverterName } from '../config';
import type { ImportConverter } from './converterTypes';
import { formatImportConverterBanner } from './importConsoleHelpers';
import { formatImportCutoffRemovalLog } from './importCutoffRemovalHelpers';
import { appendImportLog } from './importLogHelpers';
import type { ApplyImportSettingsResult } from './loadImportSettingsHelpers';
import { applyImportSettingsFromSource } from './loadImportSettingsHelpers';
import { parseImportCommand } from './parseImportCommandHelpers';
import type { ImportConverterDirs } from './runImportConverter';

export type ImportCliDeps = {
	converterNames: readonly ImportConverterName[];
	converters: Record<ImportConverterName, ImportConverter>;
	preferredSqlOrder: readonly string[];
	resolvePath: (path: string) => string;
	resetImportLog: (path: string) => Promise<void>;
	/** Clear `id-map.json` once at the start of a full pipeline (not between converters). */
	resetIdMap: (path: string) => Promise<void>;
	runImportConverter: (converter: ImportConverter, dirs: ImportConverterDirs) => Promise<void>;
	uploadImportSqlFiles: (params: {
		outDir: string;
		preferredSqlOrder: readonly string[];
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

/** Run `bun import <source> <out> [--upload]` (full pipeline) and return a process exit code. */
export async function runImportCli(argv: string[], deps: ImportCliDeps): Promise<number> {
	const log = deps.log ?? console.log;
	const error = deps.error ?? console.error;
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
	const logPath = join(dirs.outDir, IMPORT_LOG_FILE);

	const settingsResult = await applySettings(dirs.sourceDir);
	if (!settingsResult.ok) {
		error(settingsResult.error);
		return 1;
	}
	log(formatSettingsLog(settingsResult));

	const mapPath = join(dirs.outDir, IMPORT_ID_MAP_FILE);
	await deps.resetImportLog(logPath);
	const cutoffLog = formatImportCutoffRemovalLog(settingsResult.settings, settingsResult.cutoffRemovals);
	if (cutoffLog != null) {
		await appendImportLog(logPath, cutoffLog);
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
	});
	if (!result.ok) {
		error(result.error);
		return 1;
	}
	log(`Uploaded: ${result.files.join(', ')}`);
	return 0;
}
