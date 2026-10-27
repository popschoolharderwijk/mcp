import { buildScheduleFrequencyMap } from '../courses/parseScheduleFrequenciesHelpers';
import { agreementDocPassesCutoff } from '../shared/agreementCutoffHelpers';
import { buildImportBatch } from '../shared/buildImportBatchHelpers';
import type { ImportConverter } from '../shared/converterTypes';
import { getImportSettings } from '../shared/importRuntimeSettingsHelpers';
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

export const teacherLessonTypesConverter: ImportConverter<
	MappedTeacherLessonTypeRow,
	TeacherLessonTypeSqlRow,
	'teacher_lesson_types'
> = {
	name: 'teacher_lesson_types',
	entityType: 'teacher_lesson_type',
	mappedKeys: MAPPED_KEYS,
	ignoredKeys: IGNORED_KEYS,
	prepareContext(extraFileDocs) {
		setKnownTeacherOids(buildKnownTeacherOidSet(extraFileDocs['teachers.jsonl']));
	},
	buildBatch(primaryDocs, extraFileDocs, idMap, createId) {
		const scheduleMap = buildScheduleFrequencyMap(extraFileDocs['schedule_frequencies.jsonl']);
		const settings = getImportSettings();
		const docs = primaryDocs.filter((doc) => agreementDocPassesCutoff(doc, settings, scheduleMap));
		return buildImportBatch(docs, teacherLessonTypesConverter, idMap, createId);
	},
	mapDoc: mapTeacherLessonTypeDoc,
	warningsForRow: teacherLessonTypeRowWarningReasons,
	assignId: (row) => row,
	buildSql: buildTeacherLessonTypesSql,
};
