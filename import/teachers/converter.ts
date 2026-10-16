import type { ImportConverter, MappedImportRow } from '../shared/converterTypes';
import { buildTeachersRoleBatch } from './buildRoleBatchHelpers';
import { buildTeachersSql, type TeacherSqlRow } from './buildTeachersSqlHelpers';

/** Teacher role rows only — requires profiles id-map entries. */
export const teachersConverter: ImportConverter<MappedImportRow, TeacherSqlRow> = {
	name: 'teachers',
	entityType: 'teacher',
	mappedKeys: new Set(),
	ignoredKeys: new Set(),
	buildBatch(primaryDocs, _extra, idMap) {
		return buildTeachersRoleBatch(primaryDocs, idMap);
	},
	mapDoc() {
		return { ok: false, oid: null, reason: 'teachers converter uses buildBatch' };
	},
	warningsForRow: () => [],
	assignId: (row) => row as unknown as TeacherSqlRow,
	buildSql: buildTeachersSql,
};
