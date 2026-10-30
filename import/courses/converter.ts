import { buildImportBatch } from '../shared/buildImportBatchHelpers';
import type { ImportConverter } from '../shared/converterTypes';
import { getImportSettings } from '../shared/importRuntimeSettingsHelpers';
import { buildCoursesBatch } from './buildCoursesBatchHelpers';
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

export const coursesConverter: ImportConverter<MappedCourseRow, CourseSqlRow, 'courses'> = {
	name: 'courses',
	entityType: 'lesson_type',
	mappedKeys: MAPPED_KEYS,
	ignoredKeys: IGNORED_KEYS,
	prepareContext(extraFileDocs) {
		setCourseScheduleFrequencyMap(buildScheduleFrequencyMap(extraFileDocs['schedule_frequencies.jsonl']));
	},
	buildBatch(primaryDocs, _extraFileDocs, idMap, createId) {
		if (!getImportSettings().useLessonTypeAliases) {
			return buildImportBatch(primaryDocs, coursesConverter, idMap, createId);
		}
		return buildCoursesBatch(primaryDocs, idMap, createId);
	},
	mapDoc: mapCourseDoc,
	warningsForRow: courseRowWarningReasons,
	assignId: (row, id) => ({ ...row, lessonTypeId: id }),
	buildSql: buildCoursesSql,
};
