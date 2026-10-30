import { buildScheduleFrequencyMap } from '../courses/parseScheduleFrequenciesHelpers';
import { agreementDocPassesCutoff } from '../shared/agreementCutoffHelpers';
import { buildImportBatch } from '../shared/buildImportBatchHelpers';
import type { ImportConverter } from '../shared/converterTypes';
import { getImportSettings } from '../shared/importRuntimeSettingsHelpers';
import { invertLessonTypeAliases } from '../shared/lessonTypeAliasHelpers';
import { buildAgendaLessonDatesByAgreementOid } from './agendaEventIndexHelpers';
import { applySchedulePhaseShiftsToAgreementRows } from './applySchedulePhaseShiftHelpers';
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

export const agreementsCoursesConverter: ImportConverter<
	MappedAgreementCourseRow,
	AgreementCourseSqlRow,
	'agreements_courses'
> = {
	name: 'agreements_courses',
	entityType: 'lesson_agreement',
	mappedKeys: MAPPED_KEYS,
	ignoredKeys: IGNORED_KEYS,
	prepareContext(extraFileDocs) {
		const scheduleDocs = extraFileDocs['schedule_frequencies.jsonl'];
		const courseDocs = extraFileDocs['courses.jsonl'];
		setAgreementScheduleFrequencyMap(buildScheduleFrequencyMap(scheduleDocs));
		setAgreementCoursePriceIndex(buildCoursePriceIndex(courseDocs));
		setAgreementDuoCourseOids(buildDuoCourseOidSet(courseDocs));
		setAgreementGroupCourseOids(buildGroupCourseOidSet(courseDocs));
		const settings = getImportSettings();
		let sourceToCanonical = new Map<string, string>();
		if (settings.useLessonTypeAliases) {
			const inverted = invertLessonTypeAliases(settings.lessonTypeAliases);
			if (inverted.ok) sourceToCanonical = inverted.sourceToCanonical;
		}
		setAgreementCourseNameByOid(buildCourseNameByOid(courseDocs, sourceToCanonical));
	},
	buildBatch(primaryDocs, extraFileDocs, idMap, createId) {
		const scheduleMap = buildScheduleFrequencyMap(extraFileDocs['schedule_frequencies.jsonl']);
		const settings = getImportSettings();
		const docs = primaryDocs.filter((doc) => agreementDocPassesCutoff(doc, settings, scheduleMap));
		const batch = buildImportBatch(docs, agreementsCoursesConverter, idMap, createId);
		const eventDocs = extraFileDocs['c4s_agenda_events.jsonl'];
		const datesByAgreement = buildAgendaLessonDatesByAgreementOid(eventDocs);
		const attached = attachLessonGroupsToAgreementRows(batch.sqlRows, batch.idMap, createId, datesByAgreement);
		const withPhaseShifts = applySchedulePhaseShiftsToAgreementRows(attached.rows, batch.report, {
			eventDocs,
			teacherDocs: extraFileDocs['teachers.jsonl'],
			studentDocs: extraFileDocs['students.jsonl'],
		});
		return { idMap: attached.idMap, sqlRows: withPhaseShifts, report: batch.report };
	},
	mapDoc: mapAgreementCourseDoc,
	warningsForRow: agreementCourseRowWarningReasons,
	assignId: (row, id) => ({
		...row,
		agreementId: id,
		lessonGroupId: null,
		groupSlotKey: null,
		phaseShiftDeviation: null,
	}),
	buildSql: buildAgreementsCoursesSql,
};
