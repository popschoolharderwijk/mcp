import { buildScheduleFrequencyMap } from '../courses/parseScheduleFrequenciesHelpers';
import { agreementDocPassesCutoff } from '../shared/agreementCutoffHelpers';
import { buildImportBatch } from '../shared/buildImportBatchHelpers';
import type { ImportConverter } from '../shared/converterTypes';
import { getImportSettings } from '../shared/importRuntimeSettingsHelpers';
import { buildAgreementsCoursesSql } from './buildAgreementsCoursesSqlHelpers';
import { buildCoursePriceIndex } from './coursePriceIndexHelpers';
import { attachLessonGroupsToAgreementRows } from './groupLessonImportHelpers';
import {
	agreementCourseRowWarningReasons,
	buildCourseNameByOid,
	buildDuoCourseOidSet,
	buildGroupCourseOidSet,
	IGNORED_KEYS,
	MAPPED_KEYS,
	mapAgreementCourseDoc,
	setAgreementCourseNameByOid,
	setAgreementCoursePriceIndex,
	setAgreementDuoCourseOids,
	setAgreementGroupCourseOids,
	setAgreementScheduleFrequencyMap,
} from './mapAgreementCourseHelpers';
import type { AgreementCourseSqlRow, MappedAgreementCourseRow } from './types';

export const agreementsCoursesConverter: ImportConverter<MappedAgreementCourseRow, AgreementCourseSqlRow> = {
	name: 'agreements_courses',
	entityType: 'lesson_agreement',
	mappedKeys: MAPPED_KEYS,
	ignoredKeys: IGNORED_KEYS,
	prepareContext(extraFileDocs) {
		const scheduleDocs = extraFileDocs[0] ?? [];
		const courseDocs = extraFileDocs[1] ?? [];
		setAgreementScheduleFrequencyMap(buildScheduleFrequencyMap(scheduleDocs));
		setAgreementCoursePriceIndex(buildCoursePriceIndex(courseDocs));
		setAgreementDuoCourseOids(buildDuoCourseOidSet(courseDocs));
		setAgreementGroupCourseOids(buildGroupCourseOidSet(courseDocs));
		setAgreementCourseNameByOid(buildCourseNameByOid(courseDocs));
	},
	buildBatch(primaryDocs, extraFileDocs, idMap, createId) {
		const scheduleMap = buildScheduleFrequencyMap(extraFileDocs[0] ?? []);
		const settings = getImportSettings();
		const docs = primaryDocs.filter((doc) => agreementDocPassesCutoff(doc, settings, scheduleMap));
		const batch = buildImportBatch(docs, agreementsCoursesConverter, idMap, createId);
		const attached = attachLessonGroupsToAgreementRows(batch.sqlRows, batch.idMap, createId);
		return { idMap: attached.idMap, sqlRows: attached.rows, report: batch.report };
	},
	mapDoc: mapAgreementCourseDoc,
	warningsForRow: agreementCourseRowWarningReasons,
	assignId: (row, id) => ({ ...row, agreementId: id, lessonGroupId: null }),
	buildSql: buildAgreementsCoursesSql,
};
