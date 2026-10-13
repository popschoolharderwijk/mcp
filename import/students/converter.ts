import type { ImportConverter } from '../shared/converterTypes';
import { buildStudentsSql, type StudentSqlRow } from './buildStudentsSqlHelpers';
import {
	IGNORED_KEYS,
	MAPPED_KEYS,
	mapStudentDoc,
	resetStudentEmailDedup,
	studentRowWarningReasons,
} from './mapStudentHelpers';
import type { MappedStudentRow } from './types';

export const studentsConverter: ImportConverter<MappedStudentRow, StudentSqlRow> = {
	name: 'students',
	entityType: 'student',
	mappedKeys: MAPPED_KEYS,
	ignoredKeys: IGNORED_KEYS,
	prepareContext() {
		resetStudentEmailDedup();
	},
	mapDoc: mapStudentDoc,
	warningsForRow: studentRowWarningReasons,
	assignId: (row, id) => ({ ...row, userId: id }),
	buildSql: buildStudentsSql,
};
