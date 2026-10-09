/**
 * Convert a Mongo teachers JSON/JSONL export to SQL + local id-map.
 *
 * Usage:
 *   bun run import:teachers -- path/to/teachers.jsonl
 *   bun run import:teachers -- --map import/out/id-map.json --out import/out/teachers.sql path/to/teachers.jsonl
 */

import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { loadIdMap, saveIdMap } from '../shared/idMapFile';
import { parseMongoExportText } from '../shared/parseMongoExportHelpers';
import { formatImportReport } from '../shared/reportHelpers';
import { buildTeachersSql } from './buildTeachersSqlHelpers';
import { buildTeacherImportBatch, parseTeachersCliArgs } from './cliHelpers';

async function main(): Promise<void> {
	const parsed = parseTeachersCliArgs(process.argv, resolve);
	if (!parsed.ok) {
		console.error(parsed.error);
		process.exit(1);
	}

	const { inputPath, mapPath, outPath } = parsed.args;
	const file = Bun.file(inputPath);
	if (!(await file.exists())) {
		console.error(`Input not found: ${inputPath}`);
		process.exit(1);
	}

	const docs = parseMongoExportText(await file.text(), inputPath);
	const batch = buildTeacherImportBatch(docs, await loadIdMap(mapPath));
	const sql = buildTeachersSql(batch.sqlRows);

	await mkdir(dirname(outPath), { recursive: true });
	await Bun.write(outPath, sql);
	await saveIdMap(mapPath, batch.idMap);

	console.log(`Wrote ${outPath}`);
	console.log(`Updated ${mapPath}`);
	console.log(formatImportReport(batch.report));
}

await main();
