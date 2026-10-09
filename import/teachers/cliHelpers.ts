import { ensureMappedId, type MongoIdMap } from '../shared/idMapHelpers';
import { createEmptyReport, type ImportReport } from '../shared/reportHelpers';
import type { TeacherSqlRow } from './buildTeachersSqlHelpers';
import { classifyTeacherKeys, mapTeacherDoc } from './mapTeacherHelpers';
import type { MappedTeacherRow } from './types';

const TEACHER_ENTITY_TYPE = 'teacher';
export const DEFAULT_MAP_PATH = 'import/out/id-map.json';
export const DEFAULT_OUT_PATH = 'import/out/teachers.sql';

export type TeachersCliArgs = {
	inputPath: string;
	mapPath: string;
	outPath: string;
};

export type ParseTeachersCliArgsResult = { ok: true; args: TeachersCliArgs } | { ok: false; error: string };

export function teachersCliUsage(): string {
	return 'Usage: bun run import:teachers -- [--map <id-map.json>] [--out <teachers.sql>] <input.json|jsonl>';
}

type PathFlag = 'mapPath' | 'outPath';

type CliParseState = {
	mapPath: string;
	outPath: string;
	positionals: string[];
};

function takePathFlag(
	flag: PathFlag,
	value: string | undefined,
	state: CliParseState,
	resolvePath: (path: string) => string,
): ParseTeachersCliArgsResult | null {
	if (!value) return { ok: false, error: teachersCliUsage() };
	state[flag] = resolvePath(value);
	return null;
}

function applyCliToken(
	arg: string,
	next: string | undefined,
	state: CliParseState,
	resolvePath: (path: string) => string,
): ParseTeachersCliArgsResult | 'consumed-next' | null {
	if (arg === '--map') {
		return takePathFlag('mapPath', next, state, resolvePath) ?? 'consumed-next';
	}
	if (arg === '--out') {
		return takePathFlag('outPath', next, state, resolvePath) ?? 'consumed-next';
	}
	if (arg.startsWith('-')) {
		return { ok: false, error: `Unknown flag: ${arg}\n${teachersCliUsage()}` };
	}
	state.positionals.push(arg);
	return null;
}

export function parseTeachersCliArgs(
	argv: string[],
	resolvePath: (path: string) => string = (path) => path,
): ParseTeachersCliArgsResult {
	const args = argv.slice(2);
	const state: CliParseState = {
		mapPath: resolvePath(DEFAULT_MAP_PATH),
		outPath: resolvePath(DEFAULT_OUT_PATH),
		positionals: [],
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (!arg) continue;
		const result = applyCliToken(arg, args[i + 1], state, resolvePath);
		if (result === 'consumed-next') {
			i += 1;
			continue;
		}
		if (result) return result;
	}

	const inputPath = state.positionals[0];
	if (!inputPath || state.positionals.length !== 1) {
		return { ok: false, error: teachersCliUsage() };
	}

	return {
		ok: true,
		args: {
			inputPath: resolvePath(inputPath),
			mapPath: state.mapPath,
			outPath: state.outPath,
		},
	};
}

export type TeacherImportBatch = {
	idMap: MongoIdMap;
	sqlRows: TeacherSqlRow[];
	report: ImportReport;
};

function appendTeacherRowWarnings(report: ImportReport, row: MappedTeacherRow): void {
	for (const unmatched of row.unmatchedInstruments) {
		report.warnings.push({
			oid: row.mongoOid,
			reason: `Unmapped instrument "${unmatched}" (no lesson type link)`,
		});
	}
	if (row.invalidCocIssuedOn) {
		report.warnings.push({
			oid: row.mongoOid,
			reason: `Invalid vogdateissued "${row.invalidCocIssuedOn}" (expected YYYY-MM-DD)`,
		});
	}
	if (row.invalidCountryCode) {
		report.warnings.push({
			oid: row.mongoOid,
			reason: `Invalid country "${row.invalidCountryCode}" (expected ISO 3166-1 alpha-2)`,
		});
	}
}

function recordKeys(target: Set<string>, keys: string[]): void {
	for (const key of keys) {
		target.add(key);
	}
}

/** Map docs into SQL rows + report; updates id-map in memory. */
export function buildTeacherImportBatch(
	docs: unknown[],
	initialIdMap: MongoIdMap,
	createId: () => string = () => crypto.randomUUID(),
): TeacherImportBatch {
	let idMap = initialIdMap;
	const report = createEmptyReport();
	const sqlRows: TeacherSqlRow[] = [];
	const skippedKeySet = new Set<string>();
	const ignoredKeySet = new Set<string>();

	for (const doc of docs) {
		if (doc !== null && typeof doc === 'object' && !Array.isArray(doc)) {
			const classified = classifyTeacherKeys(doc);
			recordKeys(skippedKeySet, classified.skippedKeys);
			recordKeys(ignoredKeySet, classified.ignoredKeys);
		}

		const mapped = mapTeacherDoc(doc);
		if (!mapped.ok) {
			report.failed += 1;
			report.failures.push({ oid: mapped.oid, reason: mapped.reason });
			continue;
		}

		const ensured = ensureMappedId(idMap, TEACHER_ENTITY_TYPE, mapped.row.mongoOid, createId);
		idMap = ensured.map;
		sqlRows.push({ ...mapped.row, userId: ensured.id });
		if (ensured.created) {
			report.created += 1;
		} else {
			report.updated += 1;
		}
		appendTeacherRowWarnings(report, mapped.row);
	}

	report.skippedKeys = [...skippedKeySet].sort((a, b) => a.localeCompare(b));
	report.ignoredKeys = [...ignoredKeySet].sort((a, b) => a.localeCompare(b));
	return { idMap, sqlRows, report };
}
