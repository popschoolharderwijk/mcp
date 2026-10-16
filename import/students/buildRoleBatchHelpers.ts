import { buildRoleBatchFromMappedDocs } from '../shared/buildRoleBatchHelpers';
import type { ImportBatch } from '../shared/converterTypes';
import type { MongoIdMap } from '../shared/idMapHelpers';
import type { StudentSqlRow } from './buildStudentsSqlHelpers';
import {
	mapStudentDoc,
	resetStudentEmailDedup,
	STUDENT_IGNORED_KEYS,
	STUDENT_MAPPED_KEYS,
	studentRowWarningReasons,
} from './mapStudentHelpers';

/**
 * Build student role rows using user ids from the profiles id-map (no new auth users).
 */
export function buildStudentsRoleBatch(docs: unknown[], initialIdMap: MongoIdMap): ImportBatch<StudentSqlRow> {
	return buildRoleBatchFromMappedDocs({
		docs,
		initialIdMap,
		entityType: 'student',
		mappedKeys: STUDENT_MAPPED_KEYS,
		ignoredKeys: STUDENT_IGNORED_KEYS,
		mapDoc: mapStudentDoc,
		warningsForRow: studentRowWarningReasons,
		toSqlRow: (row, userId) => ({ ...row, userId }),
		resetDedup: resetStudentEmailDedup,
	});
}
