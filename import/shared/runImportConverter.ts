import { mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { IMPORT_ID_MAP_FILE, IMPORT_OUTPUTS, IMPORT_SOURCES, type ImportConverterName } from '../config';
import { buildImportBatch } from './buildImportBatchHelpers';
import type { ImportBatch, ImportConverter, MappedImportRow } from './converterTypes';
import { loadIdMap, saveIdMap } from './idMapFile';
import type { MongoIdMap } from './idMapHelpers';
import { importConsoleError, importConsoleLog } from './importConsoleHelpers';
import { buildImportExtraDocs } from './importExtraDocsHelpers';
import { resolveImportLogDir, writeImportSectionLogs } from './importLogHelpers';
import { parseMongoExportText } from './parseMongoExportHelpers';
import { formatImportReportIssueSections, formatImportReportSummary } from './reportHelpers';

export type ImportConverterDirs = {
	sourceDir: string;
	outDir: string;
};

type LoadedImportSourceFile = {
	path: string;
	text: string;
};

async function loadImportSourceFile(
	relativePath: string,
	resolvePath: (path: string) => string,
): Promise<LoadedImportSourceFile> {
	const path = resolvePath(relativePath);
	const file = Bun.file(path);
	if (!(await file.exists())) {
		importConsoleError(`Input not found: ${path}`);
		process.exit(1);
	}
	return { path, text: await file.text() };
}

async function loadImportConverterSources(
	converterName: ImportConverterName,
	sourceDir: string,
	resolvePath: (path: string) => string,
): Promise<LoadedImportSourceFile[]> {
	const sourceFiles = IMPORT_SOURCES[converterName];
	const loaded: LoadedImportSourceFile[] = [];
	for (const fileName of sourceFiles) {
		loaded.push(await loadImportSourceFile(join(sourceDir, fileName), resolvePath));
	}
	return loaded;
}

/** Prefer converter.buildBatch when present; otherwise the generic batch builder. */
export function resolveImportConverterBatch<TRow extends MappedImportRow, TSqlRow, TName extends ImportConverterName>(
	converter: ImportConverter<TRow, TSqlRow, TName>,
	primaryDocs: unknown[],
	extraFileDocs: Record<string, unknown[]>,
	idMap: MongoIdMap,
	createId: () => string,
): ImportBatch<TSqlRow> {
	if (converter.buildBatch) {
		return converter.buildBatch(primaryDocs, extraFileDocs, idMap, createId);
	}
	return buildImportBatch(primaryDocs, converter, idMap);
}

/** Load source JSON/JSONL file(s), convert, write SQL + id-map, print report. */
export async function runImportConverter<TRow extends MappedImportRow, TSqlRow, TName extends ImportConverterName>(
	converter: ImportConverter<TRow, TSqlRow, TName>,
	dirs: ImportConverterDirs,
	resolvePath: (path: string) => string = resolve,
): Promise<void> {
	const outPath = resolvePath(join(dirs.outDir, IMPORT_OUTPUTS[converter.name]));
	const mapPath = resolvePath(join(dirs.outDir, IMPORT_ID_MAP_FILE));
	const logDir = resolveImportLogDir(resolvePath(dirs.outDir));

	const loaded = await loadImportConverterSources(converter.name, dirs.sourceDir, resolvePath);
	if (loaded.length === 0) {
		importConsoleError(`No source files configured for converter: ${converter.name}`);
		process.exit(1);
	}

	const primary = loaded[0];
	const primaryDocs = parseMongoExportText(primary.text, primary.path);
	const extraFileDocs = buildImportExtraDocs(
		converter.name,
		loaded.slice(1).map((file) => parseMongoExportText(file.text, file.path)),
	);
	converter.prepareContext?.(extraFileDocs);

	const idMap = await loadIdMap(mapPath);
	const batch = resolveImportConverterBatch(converter, primaryDocs, extraFileDocs, idMap, () => crypto.randomUUID());
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
