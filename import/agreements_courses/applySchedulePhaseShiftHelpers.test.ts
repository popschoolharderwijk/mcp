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
		scheduleSlotDate: '2026-03-11',
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
		groupSlotKey: null,
		phaseShiftDeviation: null,
		...overrides,
	};
}

describe('applySchedulePhaseShiftsToAgreementRows', () => {
	it('attaches one spanning deviation and INFO when Mongo events leave the grid', () => {
		const report = createEmptyReport();
		const rows = applySchedulePhaseShiftsToAgreementRows([baseRow()], report, {
			asOfYmd: '2026-10-28',
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
			sourceType: 'lesson_agreement',
			sourceId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
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

	it('attaches one lesson_group deviation for a group slot using unioned member events', () => {
		const report = createEmptyReport();
		const groupId = 'gggggggg-gggg-gggg-gggg-gggggggggggg';
		const rows = applySchedulePhaseShiftsToAgreementRows(
			[
				baseRow({
					mongoOid: 'member-a',
					agreementId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
					studentMongoOid: 'student-a',
					isGroupLesson: true,
					lessonGroupId: groupId,
					courseName: 'Band',
					startTime: '20:00:00',
					startDate: '2025-10-14',
					dayOfWeek: 2,
				}),
				baseRow({
					mongoOid: 'member-b',
					agreementId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
					studentUserId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
					studentMongoOid: 'student-b',
					isGroupLesson: true,
					lessonGroupId: groupId,
					courseName: 'Band',
					startTime: '20:00:00',
					startDate: '2025-10-14',
					dayOfWeek: 2,
				}),
			],
			report,
			{
				asOfYmd: '2025-10-20',
				eventDocs: [
					{
						type: 'lesson',
						agreements_course: { $oid: 'member-a' },
						start: '2025-10-14T18:00:00.000Z',
					},
					{
						type: 'lesson',
						agreements_course: { $oid: 'member-a' },
						start: '2025-11-04T19:00:00.000Z',
					},
					{
						type: 'lesson',
						agreements_course: { $oid: 'member-b' },
						start: '2025-11-18T19:00:00.000Z',
					},
				],
				teacherDocs: [{ _id: { $oid: 'teacher-oid' }, name: 'Cas', surname: 'Dekker' }],
				studentDocs: [
					{ _id: { $oid: 'student-a' }, name: 'Thijs', surname: 'van de Brink' },
					{ _id: { $oid: 'student-b' }, name: 'Other', surname: 'Member' },
				],
			},
		);

		const deviation = {
			sourceType: 'lesson_group' as const,
			sourceId: groupId,
			originalDate: '2025-10-28',
			actualDate: '2025-11-04',
			startTime: '20:00:00',
		};
		expect(rows[0]?.phaseShiftDeviation).toEqual(deviation);
		expect(rows[1]?.phaseShiftDeviation).toEqual(deviation);
		expect(report.infos).toEqual([
			{
				oid: 'member-a',
				reason: '2 events fold into 1 deviation (Cas Dekker / Thijs van de Brink): biweekly 2025-10-28 → 2025-11-04 (+7d, this and future)',
			},
		]);
	});
});
