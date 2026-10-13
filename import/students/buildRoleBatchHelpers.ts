import { classifySourceKeys } from '../shared/classifySourceKeysHelpers';
import type { ImportBatch } from '../shared/converterTypes';
import { getMappedId, type MongoIdMap } from '../shared/idMapHelpers';
import { createEmptyReport } from '../shared/reportHelpers';
import type { StudentSqlRow } from './buildStudentsSqlHelpers';
import {
	IGNORED_KEYS,
	MAPPED_KEYS,
	mapStudentDoc,
	resetStudentEmailDedup,
	studentRowWarningReasons,
} from './mapStudentHelpers';

/**
 * Build student role rows using user ids from the profiles id-map (no new auth users).
 */
export function buildStudentsRoleBatch(docs: unknown[], initialIdMap: MongoIdMap): ImportBatch<StudentSqlRow> {
	resetStudentEmailDedup();

	const idMap = initialIdMap;
	const report = createEmptyReport();
	const sqlRows: StudentSqlRow[] = [];
	const skippedKeySet = new Set<string>();
	const ignoredKeySet = new Set<string>();

	for (const doc of docs) {
		if (doc !== null && typeof doc === 'object' && !Array.isArray(doc)) {
			const classified = classifySourceKeys(doc, MAPPED_KEYS, IGNORED_KEYS);
			for (const key of classified.skippedKeys) skippedKeySet.add(key);
			for (const key of classified.ignoredKeys) ignoredKeySet.add(key);
		}

		const mapped = mapStudentDoc(doc);
		if (!mapped.ok) {
			report.failed += 1;
			report.failures.push({ oid: mapped.oid, reason: mapped.reason });
			continue;
		}

		const userId = getMappedId(idMap, 'student', mapped.row.mongoOid);
		if (!userId) {
			report.failed += 1;
			report.failures.push({
				oid: mapped.row.mongoOid,
				reason: `Missing id-map student ${mapped.row.mongoOid} (run profiles first)`,
			});
			continue;
		}

		const sqlRow: StudentSqlRow = { ...mapped.row, userId };
		sqlRows.push(sqlRow);
		report.updated += 1;
		for (const reason of studentRowWarningReasons(mapped.row)) {
			report.warnings.push({ oid: mapped.row.mongoOid, reason });
		}
	}

	report.skippedKeys = [...skippedKeySet].sort((a, b) => a.localeCompare(b));
	report.ignoredKeys = [...ignoredKeySet].sort((a, b) => a.localeCompare(b));
	return { idMap, sqlRows, report };
}
