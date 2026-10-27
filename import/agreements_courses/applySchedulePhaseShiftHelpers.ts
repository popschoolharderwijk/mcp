import { buildPersonDisplayNameByOid } from '../shared/personDisplayNameHelpers';
import type { ImportReport } from '../shared/reportHelpers';
import { buildAgendaLessonDatesByAgreementOid } from './agendaEventIndexHelpers';
import { detectSchedulePhaseShift, formatSchedulePhaseShiftInfoReason } from './detectSchedulePhaseShiftHelpers';
import type { AgreementCourseSqlRow } from './types';

export type ApplySchedulePhaseShiftContext = {
	eventDocs: unknown[];
	teacherDocs: unknown[];
	studentDocs: unknown[];
};

/**
 * For non-group agreements, detect permanent Mongo agenda phase shifts and attach
 * one spanning deviation payload + INFO log line per hit.
 */
export function applySchedulePhaseShiftsToAgreementRows(
	rows: AgreementCourseSqlRow[],
	report: ImportReport,
	context: ApplySchedulePhaseShiftContext,
): AgreementCourseSqlRow[] {
	const datesByAgreement = buildAgendaLessonDatesByAgreementOid(context.eventDocs);
	if (datesByAgreement.size === 0) {
		return rows.map((row) => ({ ...row, phaseShiftDeviation: row.phaseShiftDeviation ?? null }));
	}

	const teacherNames = buildPersonDisplayNameByOid(context.teacherDocs);
	const studentNames = buildPersonDisplayNameByOid(context.studentDocs);

	return rows.map((row) => {
		if (row.isGroupLesson) {
			return { ...row, phaseShiftDeviation: null };
		}

		const actualDates = datesByAgreement.get(row.mongoOid) ?? [];
		const shift = detectSchedulePhaseShift({
			startDate: row.startDate,
			dayOfWeek: row.dayOfWeek,
			frequency: row.frequency,
			endDate: row.endDate,
			actualDates,
		});
		if (shift == null) {
			return { ...row, phaseShiftDeviation: null };
		}

		const teacherName = teacherNames.get(row.teacherMongoOid) ?? 'unknown teacher';
		const studentName = studentNames.get(row.studentMongoOid) ?? 'unknown student';
		report.infos.push({
			oid: row.mongoOid,
			reason: formatSchedulePhaseShiftInfoReason({ shift, teacherName, studentName }),
		});

		return {
			...row,
			phaseShiftDeviation: {
				agreementId: row.agreementId,
				originalDate: shift.originalDate,
				actualDate: shift.actualDate,
				startTime: row.startTime,
			},
		};
	});
}
