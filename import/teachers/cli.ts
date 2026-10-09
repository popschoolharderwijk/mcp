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
import { ensureMappedId, type MongoIdMap } from '../shared/idMapHelpers';
import { parseMongoExportText } from '../shared/parseMongoExportHelpers';
import { createEmptyReport, formatImportReport } from '../shared/reportHelpers';
import { buildTeachersSql, type TeacherSqlRow } from './buildTeachersSqlHelpers';
import { mapTeacherDoc } from './mapTeacherHelpers';

const ENTITY_TYPE = 'teacher';
const DEFAULT_MAP_PATH = 'import/out/id-map.json';
const DEFAULT_OUT_PATH = 'import/out/teachers.sql';

type CliArgs = {
	inputPath: string;
	mapPath: string;
	outPath: string;
};

function printUsage(): never {
	console.error(`Usage: bun run import:teachers -- [--map <id-map.json>] [--out <teachers.sql>] <input.json|jsonl>`);
	process.exit(1);
}

function parseArgs(argv: string[]): CliArgs {
	const args = argv.slice(2);
	let mapPath = resolve(DEFAULT_MAP_PATH);
	let outPath = resolve(DEFAULT_OUT_PATH);
	const positionals: string[] = [];

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === '--map') {
			const value = args[++i];
			if (!value) printUsage();
			mapPath = resolve(value);
			continue;
		}
		if (arg === '--out') {
			const value = args[++i];
			if (!value) printUsage();
			outPath = resolve(value);
			continue;
		}
		if (arg?.startsWith('-')) {
			console.error(`Unknown flag: ${arg}`);
			printUsage();
		}
		if (arg) positionals.push(arg);
	}

	const inputPath = positionals[0];
	if (!inputPath || positionals.length !== 1) printUsage();

	return { inputPath: resolve(inputPath), mapPath, outPath };
}

async function main(): Promise<void> {
	const { inputPath, mapPath, outPath } = parseArgs(process.argv);
	const file = Bun.file(inputPath);
	if (!(await file.exists())) {
		console.error(`Input not found: ${inputPath}`);
		process.exit(1);
	}

	const text = await file.text();
	const docs = parseMongoExportText(text, inputPath);
	let idMap: MongoIdMap = await loadIdMap(mapPath);
	const report = createEmptyReport();
	const sqlRows: TeacherSqlRow[] = [];

	for (const doc of docs) {
		const mapped = mapTeacherDoc(doc);
		if (!mapped.ok) {
			report.failed += 1;
			report.failures.push({ oid: mapped.oid, reason: mapped.reason });
			continue;
		}

		const ensured = ensureMappedId(idMap, ENTITY_TYPE, mapped.row.mongoOid, () => crypto.randomUUID());
		idMap = ensured.map;
		sqlRows.push({ ...mapped.row, userId: ensured.id });
		if (ensured.created) {
			report.created += 1;
		} else {
			report.updated += 1;
		}
		for (const unmatched of mapped.row.unmatchedInstruments) {
			report.warnings.push({
				oid: mapped.row.mongoOid,
				reason: `Unmapped instrument "${unmatched}" (no lesson type link)`,
			});
		}
	}

	const sql = buildTeachersSql(sqlRows);
	await mkdir(dirname(outPath), { recursive: true });
	await Bun.write(outPath, sql);
	await saveIdMap(mapPath, idMap);

	console.log(`Wrote ${outPath}`);
	console.log(`Updated ${mapPath}`);
	console.log(formatImportReport(report));
}

await main();
