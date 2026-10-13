import type { ImportConverter } from '../shared/converterTypes';
import { buildCoursesSql } from './buildCoursesSqlHelpers';
import {
	courseRowWarningReasons,
	IGNORED_COURSE_KEYS,
	MAPPED_COURSE_KEYS,
	mapCourseDoc,
	setCourseScheduleFrequencyMap,
} from './mapCourseHelpers';
import { buildScheduleFrequencyMap } from './parseScheduleFrequenciesHelpers';
import type { CourseSqlRow, MappedCourseRow } from './types';

export const coursesConverter: ImportConverter<MappedCourseRow, CourseSqlRow> = {
	name: 'courses',
	entityType: 'lesson_type',
	mappedKeys: MAPPED_COURSE_KEYS,
	ignoredKeys: IGNORED_COURSE_KEYS,
	prepareContext(extraFileDocs) {
		const scheduleDocs = extraFileDocs[0] ?? [];
		setCourseScheduleFrequencyMap(buildScheduleFrequencyMap(scheduleDocs));
	},
	mapDoc: mapCourseDoc,
	warningsForRow: courseRowWarningReasons,
	assignId: (row, id) => ({ ...row, lessonTypeId: id }),
	buildSql: buildCoursesSql,
};
