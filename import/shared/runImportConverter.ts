import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { IMPORT_ID_MAP_PATH, IMPORT_OUTPUTS, IMPORT_SOURCES } from '../config';
import { buildImportBatch } from './buildImportBatchHelpers';
import type { ImportConverter, MappedImportRow } from './converterTypes';
import { loadIdMap, saveIdMap } from './idMapFile';
import { parseMongoExportText } from './parseMongoExportHelpers';
import { formatImportReport } from './reportHelpers';

/** Load source JSONL, convert, write SQL + id-map, print report. */
export async function runImportConverter<TRow extends MappedImportRow, TSqlRow>(
	converter: ImportConverter<TRow, TSqlRow>,
	resolvePath: (path: string) => string = resolve,
): Promise<void> {
	const inputPath = resolvePath(IMPORT_SOURCES[converter.name]);
	const outPath = resolvePath(IMPORT_OUTPUTS[converter.name]);
	const mapPath = resolvePath(IMPORT_ID_MAP_PATH);

	const file = Bun.file(inputPath);
	if (!(await file.exists())) {
		console.error(`Input not found: ${inputPath}`);
		process.exit(1);
	}

	const docs = parseMongoExportText(await file.text(), inputPath);
	const batch = buildImportBatch(docs, converter, await loadIdMap(mapPath));
	const sql = converter.buildSql(batch.sqlRows);

	await mkdir(dirname(outPath), { recursive: true });
	await Bun.write(outPath, sql);
	await saveIdMap(mapPath, batch.idMap);

	console.log(`Wrote ${outPath}`);
	console.log(`Updated ${mapPath}`);
	console.log(formatImportReport(batch.report));
}
