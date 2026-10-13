import { classifySourceKeys } from '../shared/classifySourceKeysHelpers';
import type { ImportBatch } from '../shared/converterTypes';
import { getMappedId, type MongoIdMap } from '../shared/idMapHelpers';
import { createEmptyReport } from '../shared/reportHelpers';
import type { TeacherSqlRow } from './buildTeachersSqlHelpers';
import {
	IGNORED_KEYS,
	MAPPED_KEYS,
	mapTeacherDoc,
	resetTeacherEmailDedup,
	teacherRowWarningReasons,
} from './mapTeacherHelpers';

/**
 * Build teacher role rows using user ids from the profiles id-map (no new auth users).
 */
export function buildTeachersRoleBatch(docs: unknown[], initialIdMap: MongoIdMap): ImportBatch<TeacherSqlRow> {
	resetTeacherEmailDedup();

	const idMap = initialIdMap;
	const report = createEmptyReport();
	const sqlRows: TeacherSqlRow[] = [];
	const skippedKeySet = new Set<string>();
	const ignoredKeySet = new Set<string>();

	for (const doc of docs) {
		if (doc !== null && typeof doc === 'object' && !Array.isArray(doc)) {
			const classified = classifySourceKeys(doc, MAPPED_KEYS, IGNORED_KEYS);
			for (const key of classified.skippedKeys) skippedKeySet.add(key);
			for (const key of classified.ignoredKeys) ignoredKeySet.add(key);
		}

		const mapped = mapTeacherDoc(doc);
		if (!mapped.ok) {
			report.failed += 1;
			report.failures.push({ oid: mapped.oid, reason: mapped.reason });
			continue;
		}

		const userId = getMappedId(idMap, 'teacher', mapped.row.mongoOid);
		if (!userId) {
			report.failed += 1;
			report.failures.push({
				oid: mapped.row.mongoOid,
				reason: `Missing id-map teacher ${mapped.row.mongoOid} (run profiles first)`,
			});
			continue;
		}

		const sqlRow: TeacherSqlRow = { ...mapped.row, userId };
		sqlRows.push(sqlRow);
		report.updated += 1;
		for (const reason of teacherRowWarningReasons(mapped.row)) {
			report.warnings.push({ oid: mapped.row.mongoOid, reason });
		}
	}

	report.skippedKeys = [...skippedKeySet].sort((a, b) => a.localeCompare(b));
	report.ignoredKeys = [...ignoredKeySet].sort((a, b) => a.localeCompare(b));
	return { idMap, sqlRows, report };
}
