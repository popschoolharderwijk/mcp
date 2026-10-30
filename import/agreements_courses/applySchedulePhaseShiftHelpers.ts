import { formatYmd } from '../shared/dateHelpers';
import { buildPersonDisplayNameByOid } from '../shared/personDisplayNameHelpers';
import type { ImportReport } from '../shared/reportHelpers';
import { buildAgendaLessonDatesByAgreementOid } from './agendaEventIndexHelpers';
import {
	detectSchedulePhaseShift,
	formatSchedulePhaseShiftInfoReason,
	type SchedulePhaseShift,
} from './detectSchedulePhaseShiftHelpers';
import type { AgreementCourseSqlRow, SchedulePhaseShiftDeviationSql } from './types';

export type ApplySchedulePhaseShiftContext = {
	eventDocs: unknown[];
	teacherDocs: unknown[];
	studentDocs: unknown[];
	/** Import "today"; forward-window validation drops stale historical phase flips. */
	asOfYmd?: string;
};

type PersonNameByOid = ReadonlyMap<string, string>;

function phaseShiftDeviationForRow(
	row: AgreementCourseSqlRow,
	shift: { originalDate: string; actualDate: string },
): SchedulePhaseShiftDeviationSql | null {
	if (row.isGroupLesson) {
		if (row.lessonGroupId == null) return null;
		return {
			sourceType: 'lesson_group',
			sourceId: row.lessonGroupId,
			originalDate: shift.originalDate,
			actualDate: shift.actualDate,
			startTime: row.startTime,
		};
	}
	return {
		sourceType: 'lesson_agreement',
		sourceId: row.agreementId,
		originalDate: shift.originalDate,
		actualDate: shift.actualDate,
		startTime: row.startTime,
	};
}

function unionAgendaDates(datesByAgreement: ReadonlyMap<string, string[]>, mongoOids: readonly string[]): string[] {
	const dates = new Set<string>();
	for (const oid of mongoOids) {
		for (const ymd of datesByAgreement.get(oid) ?? []) dates.add(ymd);
	}
	return [...dates].sort();
}

function collectGroupMembersByLessonGroupId(
	rows: readonly AgreementCourseSqlRow[],
): Map<string, AgreementCourseSqlRow[]> {
	const groupMembers = new Map<string, AgreementCourseSqlRow[]>();
	for (const row of rows) {
		if (!row.isGroupLesson || row.lessonGroupId == null) continue;
		const existing = groupMembers.get(row.lessonGroupId);
		if (existing) existing.push(row);
		else groupMembers.set(row.lessonGroupId, [row]);
	}
	return groupMembers;
}

function pickPrimaryGroupMember(members: readonly AgreementCourseSqlRow[]): AgreementCourseSqlRow | null {
	return (
		[...members].sort((left, right) => {
			const byStart = left.startDate.localeCompare(right.startDate);
			if (byStart !== 0) return byStart;
			return left.mongoOid.localeCompare(right.mongoOid);
		})[0] ?? null
	);
}

function resolveGroupScheduleEndDate(members: readonly AgreementCourseSqlRow[]): string | null {
	if (members.some((member) => member.endDate == null)) return null;
	return (
		[...members]
			.map((member) => member.endDate)
			.sort()
			.at(-1) ?? null
	);
}

function pushPhaseShiftInfo(
	report: ImportReport,
	row: AgreementCourseSqlRow,
	shift: SchedulePhaseShift,
	teacherNames: PersonNameByOid,
	studentNames: PersonNameByOid,
): void {
	report.infos.push({
		oid: row.mongoOid,
		reason: formatSchedulePhaseShiftInfoReason({
			shift,
			teacherName: teacherNames.get(row.teacherMongoOid) ?? 'unknown teacher',
			studentName: studentNames.get(row.studentMongoOid) ?? 'unknown student',
		}),
	});
}

function buildGroupPhaseShiftDeviations(
	groupMembers: ReadonlyMap<string, AgreementCourseSqlRow[]>,
	datesByAgreement: ReadonlyMap<string, string[]>,
	asOfYmd: string,
	report: ImportReport,
	teacherNames: PersonNameByOid,
	studentNames: PersonNameByOid,
): Map<string, SchedulePhaseShiftDeviationSql> {
	const groupDeviationById = new Map<string, SchedulePhaseShiftDeviationSql>();
	for (const [lessonGroupId, members] of groupMembers) {
		const primary = pickPrimaryGroupMember(members);
		if (!primary) continue;
		const shift = detectSchedulePhaseShift({
			startDate: primary.startDate,
			dayOfWeek: primary.dayOfWeek,
			frequency: primary.frequency,
			endDate: resolveGroupScheduleEndDate(members),
			actualDates: unionAgendaDates(
				datesByAgreement,
				members.map((member) => member.mongoOid),
			),
			asOfYmd,
		});
		if (shift == null) continue;

		const deviation = phaseShiftDeviationForRow(primary, shift);
		if (deviation == null) continue;
		groupDeviationById.set(lessonGroupId, deviation);
		pushPhaseShiftInfo(report, primary, shift, teacherNames, studentNames);
	}
	return groupDeviationById;
}

function applySoloPhaseShift(
	row: AgreementCourseSqlRow,
	datesByAgreement: ReadonlyMap<string, string[]>,
	asOfYmd: string,
	report: ImportReport,
	teacherNames: PersonNameByOid,
	studentNames: PersonNameByOid,
): AgreementCourseSqlRow {
	const shift = detectSchedulePhaseShift({
		startDate: row.startDate,
		dayOfWeek: row.dayOfWeek,
		frequency: row.frequency,
		endDate: row.endDate,
		actualDates: datesByAgreement.get(row.mongoOid) ?? [],
		asOfYmd,
	});
	if (shift == null) {
		return { ...row, phaseShiftDeviation: null };
	}
	pushPhaseShiftInfo(report, row, shift, teacherNames, studentNames);
	return {
		...row,
		phaseShiftDeviation: phaseShiftDeviationForRow(row, shift),
	};
}

/**
 * Detect permanent Mongo agenda phase shifts and attach one spanning deviation
 * payload + INFO log line per hit. Group slots share one deviation on the lesson_group
 * agenda event (member event dates are unioned).
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

	const asOfYmd = context.asOfYmd ?? formatYmd(new Date());
	const teacherNames = buildPersonDisplayNameByOid(context.teacherDocs);
	const studentNames = buildPersonDisplayNameByOid(context.studentDocs);
	const groupDeviationById = buildGroupPhaseShiftDeviations(
		collectGroupMembersByLessonGroupId(rows),
		datesByAgreement,
		asOfYmd,
		report,
		teacherNames,
		studentNames,
	);

	return rows.map((row) => {
		if (row.isGroupLesson) {
			const deviation = row.lessonGroupId != null ? (groupDeviationById.get(row.lessonGroupId) ?? null) : null;
			return { ...row, phaseShiftDeviation: deviation };
		}
		return applySoloPhaseShift(row, datesByAgreement, asOfYmd, report, teacherNames, studentNames);
	});
}
