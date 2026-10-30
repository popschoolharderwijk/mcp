import { mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { IMPORT_ID_MAP_FILE, IMPORT_OUTPUTS, IMPORT_SOURCES, type ImportConverterName } from '../config';
import { buildImportBatch } from './buildImportBatchHelpers';
import type { ImportConverter, MappedImportRow } from './converterTypes';
import { loadIdMap, saveIdMap } from './idMapFile';
import { importConsoleError, importConsoleLog } from './importConsoleHelpers';
import { buildImportExtraDocs } from './importExtraDocsHelpers';
import { resolveImportLogDir, writeImportSectionLogs } from './importLogHelpers';
import { parseMongoExportText } from './parseMongoExportHelpers';
import { formatImportReportIssueSections, formatImportReportSummary } from './reportHelpers';

export type ImportConverterDirs = {
	sourceDir: string;
	outDir: string;
};

async function requireImportSourceFile(
	relativePath: string,
	resolvePath: (path: string) => string,
): Promise<{ path: string; text: string }> {
	const path = resolvePath(relativePath);
	const file = Bun.file(path);
	if (!(await file.exists())) {
		importConsoleError(`Input not found: ${path}`);
		process.exit(1);
	}
	return { path, text: await file.text() };
}

/** Load source JSON/JSONL file(s), convert, write SQL + id-map, print report. */
export async function runImportConverter<TRow extends MappedImportRow, TSqlRow, TName extends ImportConverterName>(
	converter: ImportConverter<TRow, TSqlRow, TName>,
	dirs: ImportConverterDirs,
	resolvePath: (path: string) => string = resolve,
): Promise<void> {
	const sourceFiles = IMPORT_SOURCES[converter.name];
	const outPath = resolvePath(join(dirs.outDir, IMPORT_OUTPUTS[converter.name]));
	const mapPath = resolvePath(join(dirs.outDir, IMPORT_ID_MAP_FILE));
	const logDir = resolveImportLogDir(resolvePath(dirs.outDir));

	const loaded = [];
	for (const fileName of sourceFiles) {
		loaded.push(await requireImportSourceFile(join(dirs.sourceDir, fileName), resolvePath));
	}

	const primary = loaded[0];
	if (!primary) {
		importConsoleError(`No source files configured for converter: ${converter.name}`);
		process.exit(1);
	}

	const primaryDocs = parseMongoExportText(primary.text, primary.path);
	const extraFileDocs = buildImportExtraDocs(
		converter.name,
		loaded.slice(1).map((file) => parseMongoExportText(file.text, file.path)),
	);
	converter.prepareContext?.(extraFileDocs);

	const idMap = await loadIdMap(mapPath);
	const batch = converter.buildBatch
		? converter.buildBatch(primaryDocs, extraFileDocs, idMap, () => crypto.randomUUID())
		: buildImportBatch(primaryDocs, converter, idMap);
	const sql = converter.buildSql(batch.sqlRows);

	await mkdir(dirname(outPath), { recursive: true });
	await Bun.write(outPath, sql);
	await saveIdMap(mapPath, batch.idMap);
	await writeImportSectionLogs(logDir, converter.name, formatImportReportIssueSections(batch.report));

	importConsoleLog(`Wrote ${outPath}`);
	importConsoleLog(`Updated ${mapPath}`);
	importConsoleLog(formatImportReportSummary(batch.report));
	importConsoleLog(`Logs: ${logDir}`);
}
