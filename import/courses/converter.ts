import type { ImportConverter } from '../shared/converterTypes';
import { buildCoursesSql } from './buildCoursesSqlHelpers';
import {
	courseRowWarningReasons,
	IGNORED_KEYS,
	MAPPED_KEYS,
	mapCourseDoc,
	setCourseScheduleFrequencyMap,
} from './mapCourseHelpers';
import { buildScheduleFrequencyMap } from './parseScheduleFrequenciesHelpers';
import type { CourseSqlRow, MappedCourseRow } from './types';

export const coursesConverter: ImportConverter<MappedCourseRow, CourseSqlRow> = {
	name: 'courses',
	entityType: 'lesson_type',
	mappedKeys: MAPPED_KEYS,
	ignoredKeys: IGNORED_KEYS,
	prepareContext(extraFileDocs) {
		const scheduleDocs = extraFileDocs[0] ?? [];
		setCourseScheduleFrequencyMap(buildScheduleFrequencyMap(scheduleDocs));
	},
	mapDoc: mapCourseDoc,
	warningsForRow: courseRowWarningReasons,
	assignId: (row, id) => ({ ...row, lessonTypeId: id }),
	buildSql: buildCoursesSql,
};
