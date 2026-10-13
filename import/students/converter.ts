import type { ImportConverter, MappedImportRow } from '../shared/converterTypes';
import { buildStudentsRoleBatch } from './buildRoleBatchHelpers';
import { buildStudentsSql, type StudentSqlRow } from './buildStudentsSqlHelpers';

/** Student role rows only — requires profiles id-map entries. */
export const studentsConverter: ImportConverter<MappedImportRow, StudentSqlRow> = {
	name: 'students',
	entityType: 'student',
	mappedKeys: new Set(),
	ignoredKeys: new Set(),
	buildBatch(primaryDocs, _extra, idMap) {
		return buildStudentsRoleBatch(primaryDocs, idMap);
	},
	mapDoc() {
		return { ok: false, oid: null, reason: 'students converter uses buildBatch' };
	},
	warningsForRow: () => [],
	assignId: (row) => row as unknown as StudentSqlRow,
	buildSql: buildStudentsSql,
};
