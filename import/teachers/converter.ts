import type { ImportConverter } from '../shared/converterTypes';
import { buildTeachersSql, type TeacherSqlRow } from './buildTeachersSqlHelpers';
import {
	IGNORED_TEACHER_KEYS,
	MAPPED_TEACHER_KEYS,
	mapTeacherDoc,
	teacherRowWarningReasons,
} from './mapTeacherHelpers';
import type { MappedTeacherRow } from './types';

export const teachersConverter: ImportConverter<MappedTeacherRow, TeacherSqlRow> = {
	name: 'teachers',
	entityType: 'teacher',
	mappedKeys: MAPPED_TEACHER_KEYS,
	ignoredKeys: IGNORED_TEACHER_KEYS,
	mapDoc: mapTeacherDoc,
	warningsForRow: teacherRowWarningReasons,
	assignId: (row, id) => ({ ...row, userId: id }),
	buildSql: buildTeachersSql,
};
