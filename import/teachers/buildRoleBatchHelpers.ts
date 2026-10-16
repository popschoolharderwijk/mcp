import { buildRoleBatchFromMappedDocs } from '../shared/buildRoleBatchHelpers';
import type { ImportBatch } from '../shared/converterTypes';
import type { MongoIdMap } from '../shared/idMapHelpers';
import type { TeacherSqlRow } from './buildTeachersSqlHelpers';
import {
	mapTeacherDoc,
	resetTeacherEmailDedup,
	TEACHER_IGNORED_KEYS,
	TEACHER_MAPPED_KEYS,
	teacherRowWarningReasons,
} from './mapTeacherHelpers';

/**
 * Build teacher role rows using user ids from the profiles id-map (no new auth users).
 */
export function buildTeachersRoleBatch(docs: unknown[], initialIdMap: MongoIdMap): ImportBatch<TeacherSqlRow> {
	return buildRoleBatchFromMappedDocs({
		docs,
		initialIdMap,
		entityType: 'teacher',
		mappedKeys: TEACHER_MAPPED_KEYS,
		ignoredKeys: TEACHER_IGNORED_KEYS,
		mapDoc: mapTeacherDoc,
		warningsForRow: teacherRowWarningReasons,
		toSqlRow: (row, userId) => ({ ...row, userId }),
		resetDedup: resetTeacherEmailDedup,
	});
}
