import { buildScheduleFrequencyMap } from '../courses/parseScheduleFrequenciesHelpers';
import type { ImportConverter } from '../shared/converterTypes';
import { buildAgreementsCoursesSql } from './buildAgreementsCoursesSqlHelpers';
import { buildCoursePriceIndex } from './coursePriceIndexHelpers';
import {
	agreementCourseRowWarningReasons,
	buildDuoCourseOidSet,
	IGNORED_KEYS,
	MAPPED_KEYS,
	mapAgreementCourseDoc,
	setAgreementCoursePriceIndex,
	setAgreementDuoCourseOids,
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
	},
	mapDoc: mapAgreementCourseDoc,
	warningsForRow: agreementCourseRowWarningReasons,
	assignId: (row, id) => ({ ...row, agreementId: id }),
	buildSql: buildAgreementsCoursesSql,
};
