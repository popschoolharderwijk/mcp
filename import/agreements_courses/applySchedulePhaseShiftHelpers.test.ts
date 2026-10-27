import { describe, expect, it } from 'bun:test';
import { createEmptyReport } from '../shared/reportHelpers';
import { applySchedulePhaseShiftsToAgreementRows } from './applySchedulePhaseShiftHelpers';
import type { AgreementCourseSqlRow } from './types';

function baseRow(overrides: Partial<AgreementCourseSqlRow> = {}): AgreementCourseSqlRow {
	return {
		mongoOid: 'agreement-oid',
		agreementId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
		studentUserId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
		teacherUserId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
		studentMongoOid: 'student-oid',
		teacherMongoOid: 'teacher-oid',
		lessonTypeId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
		courseOid: 'course-oid',
		courseName: null,
		durationMinutes: 30,
		frequency: 'biweekly',
		pricePerLesson: 50,
		dayOfWeek: 3,
		startTime: '14:00:00',
		startDate: '2026-03-11',
		endDate: null,
		isActive: true,
		notes: null,
		signupSource: 'staff',
		paymentMethod: 'sepa',
		monthlyAmountCents: null,
		duoPairId: null,
		isGroupLesson: false,
		synthesizeLessonTypeOption: false,
		optionWarning: null,
		eventsMismatchWarning: null,
		lessonGroupId: null,
		phaseShiftDeviation: null,
		...overrides,
	};
}

describe('applySchedulePhaseShiftsToAgreementRows', () => {
	it('attaches one spanning deviation and INFO when Mongo events leave the grid', () => {
		const report = createEmptyReport();
		const rows = applySchedulePhaseShiftsToAgreementRows([baseRow()], report, {
			eventDocs: [
				{
					type: 'lesson',
					agreements_course: { $oid: 'agreement-oid' },
					start: '2026-10-07T12:00:00.000Z',
				},
				{
					type: 'lesson',
					agreements_course: { $oid: 'agreement-oid' },
					start: '2026-10-28T13:00:00.000Z',
				},
				{
					type: 'lesson',
					agreements_course: { $oid: 'agreement-oid' },
					start: '2026-11-11T13:00:00.000Z',
				},
			],
			teacherDocs: [{ _id: { $oid: 'teacher-oid' }, name: 'Ada', surname: 'Teacher' }],
			studentDocs: [{ _id: { $oid: 'student-oid' }, name: 'Mike', surname: 'Student' }],
		});

		expect(rows[0]?.phaseShiftDeviation).toEqual({
			agreementId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
			originalDate: '2026-10-21',
			actualDate: '2026-10-28',
			startTime: '14:00:00',
		});
		expect(report.infos).toEqual([
			{
				oid: 'agreement-oid',
				reason: '2 events fold into 1 deviation (Ada Teacher / Mike Student): biweekly 2026-10-21 → 2026-10-28 (+7d, this and future)',
			},
		]);
	});

	it('skips group lessons even when events would match a phase shift', () => {
		const report = createEmptyReport();
		const rows = applySchedulePhaseShiftsToAgreementRows([baseRow({ isGroupLesson: true })], report, {
			eventDocs: [
				{
					type: 'lesson',
					agreements_course: { $oid: 'agreement-oid' },
					start: '2026-10-28T13:00:00.000Z',
				},
				{
					type: 'lesson',
					agreements_course: { $oid: 'agreement-oid' },
					start: '2026-11-11T13:00:00.000Z',
				},
			],
			teacherDocs: [],
			studentDocs: [],
		});

		expect(rows[0]?.phaseShiftDeviation).toBeNull();
		expect(report.infos).toEqual([]);
	});
});
