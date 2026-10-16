import type { ImportConverter } from '../shared/converterTypes';
import { buildTeacherLessonTypesSql } from './buildTeacherLessonTypesSqlHelpers';
import {
	buildKnownTeacherOidSet,
	IGNORED_KEYS,
	MAPPED_KEYS,
	mapTeacherLessonTypeDoc,
	setKnownTeacherOids,
	teacherLessonTypeRowWarningReasons,
} from './mapTeacherLessonTypeHelpers';
import type { MappedTeacherLessonTypeRow, TeacherLessonTypeSqlRow } from './types';

export const teacherLessonTypesConverter: ImportConverter<MappedTeacherLessonTypeRow, TeacherLessonTypeSqlRow> = {
	name: 'teacher_lesson_types',
	entityType: 'teacher_lesson_type',
	mappedKeys: MAPPED_KEYS,
	ignoredKeys: IGNORED_KEYS,
	prepareContext(extraFileDocs) {
		setKnownTeacherOids(buildKnownTeacherOidSet(extraFileDocs[0] ?? []));
	},
	mapDoc: mapTeacherLessonTypeDoc,
	warningsForRow: teacherLessonTypeRowWarningReasons,
	assignId: (row) => row,
	buildSql: buildTeacherLessonTypesSql,
};
