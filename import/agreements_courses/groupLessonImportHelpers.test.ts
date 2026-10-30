import { describe, expect, it } from 'bun:test';
import { createEmptyIdMap, getMappedId, setMappedId } from '../shared/idMapHelpers';
import {
	attachLessonGroupsToAgreementRows,
	buildGroupLessonName,
	coalesceLessonGroupMembers,
	computeGroupAgendaEndDate,
	computeGroupAgendaEndTime,
	computeGroupAgendaStartDate,
	groupLessonSlotKey,
} from './groupLessonImportHelpers';
import type { AgreementCourseSqlRow } from './types';

const GROUP_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const GROUP_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const TEACHER = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const LESSON_TYPE = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const STUDENT_1 = '11111111-1111-1111-1111-111111111111';
const STUDENT_2 = '22222222-2222-2222-2222-222222222222';
const STUDENT_3 = '33333333-3333-3333-3333-333333333333';

function baseGroupRow(overrides: Partial<AgreementCourseSqlRow> = {}): AgreementCourseSqlRow {
	return {
		mongoOid: 'agreement-oid',
		agreementId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
		studentUserId: STUDENT_1,
		teacherUserId: TEACHER,
		studentMongoOid: 'student-oid',
		teacherMongoOid: 'teacher-oid',
		lessonTypeId: LESSON_TYPE,
		courseOid: 'course-group',
		courseName: 'Bandles',
		durationMinutes: 60,
		frequency: 'weekly',
		pricePerLesson: 20,
		dayOfWeek: 2,
		startTime: '19:00:00',
		startDate: '2024-08-26',
		scheduleSlotDate: '2024-08-26',
		endDate: null,
		isActive: true,
		notes: null,
		signupSource: 'staff',
		paymentMethod: 'sepa',
		monthlyAmountCents: null,
		duoPairId: null,
		isGroupLesson: true,
		synthesizeLessonTypeOption: false,
		optionWarning: null,
		eventsMismatchWarning: null,
		lessonGroupId: null,
		groupSlotKey: null,
		phaseShiftDeviation: null,
		...overrides,
	};
}

function attachWithIds(rows: AgreementCourseSqlRow[], ids: string[]) {
	let nextId = 0;
	return attachLessonGroupsToAgreementRows(rows, createEmptyIdMap(), () => ids[nextId++] ?? 'overflow');
}

describe('buildGroupLessonName', () => {
	it('includes Dutch weekday and HH:MM', () => {
		expect(buildGroupLessonName('Bandles', 2, '19:00:00')).toBe('Bandles dinsdag 19:00');
	});
});

describe('computeGroupAgendaStartDate', () => {
	it('aligns start date forward to the matching weekday', () => {
		// 2024-08-26 is Monday; dayOfWeek 2 = Tuesday → 2024-08-27
		expect(computeGroupAgendaStartDate('2024-08-26', 2)).toBe('2024-08-27');
	});

	it('keeps the date when it already matches the weekday', () => {
		expect(computeGroupAgendaStartDate('2024-08-27', 2)).toBe('2024-08-27');
	});
});

describe('computeGroupAgendaEndTime', () => {
	it('adds duration while preserving seconds', () => {
		expect(computeGroupAgendaEndTime('19:00:00', 60)).toBe('20:00:00');
		expect(computeGroupAgendaEndTime('19:35:52', 30)).toBe('20:05:52');
	});

	it('wraps past midnight into the next calendar day clock', () => {
		expect(computeGroupAgendaEndTime('23:57:12', 30)).toBe('00:27:12');
	});
});

describe('computeGroupAgendaEndDate', () => {
	it('keeps the start date when the lesson ends the same day', () => {
		expect(computeGroupAgendaEndDate('2024-08-27', '19:00:00', 60)).toBe('2024-08-27');
	});

	it('rolls to the next day when duration crosses midnight', () => {
		expect(computeGroupAgendaEndDate('2024-02-29', '23:57:12', 30)).toBe('2024-03-01');
	});
});

describe('attachLessonGroupsToAgreementRows shared slot', () => {
	it('shares one lesson_group id across members of the same slot', () => {
		const rows = [
			baseGroupRow({
				mongoOid: 'a1',
				agreementId: 'a1-uuid',
				studentUserId: STUDENT_1,
				startDate: '2024-09-01',
			}),
			baseGroupRow({
				mongoOid: 'a2',
				agreementId: 'a2-uuid',
				studentUserId: STUDENT_2,
				startDate: '2024-08-26',
				endDate: '2025-06-01',
			}),
		];
		const result = attachWithIds(rows, [GROUP_A, GROUP_B]);

		expect(result.groups).toHaveLength(1);
		expect(result.rows[0]?.lessonGroupId).toBe(GROUP_A);
		expect(result.rows[1]?.lessonGroupId).toBe(GROUP_A);
		expect(getMappedId(result.idMap, 'lesson_group', groupLessonSlotKey(rows[0]))).toBe(GROUP_A);
	});

	it('derives group name date range and agenda fields from members', () => {
		const rows = [
			baseGroupRow({
				mongoOid: 'a1',
				agreementId: 'a1-uuid',
				studentUserId: STUDENT_1,
				startDate: '2024-09-01',
			}),
			baseGroupRow({
				mongoOid: 'a2',
				agreementId: 'a2-uuid',
				studentUserId: STUDENT_2,
				startDate: '2024-08-26',
				endDate: '2025-06-01',
			}),
		];
		const result = attachWithIds(rows, [GROUP_A]);

		expect(result.groups[0]?.name).toBe('Bandles dinsdag 19:00');
		expect(result.groups[0]?.startDate).toBe('2024-08-26');
		expect(result.groups[0]?.endDate).toBeNull();
		expect(result.groups[0]?.agendaStartDate).toBe('2024-08-27');
		expect(result.groups[0]?.agendaEndDate).toBe('2024-08-27');
		expect(result.groups[0]?.agendaEndTime).toBe('20:00:00');
	});

	it('sets agendaEndDate to the next day for midnight-crossing slots', () => {
		const result = attachWithIds(
			[
				baseGroupRow({
					startTime: '23:57:12',
					durationMinutes: 30,
					dayOfWeek: 4,
					startDate: '2024-02-29',
					courseName: 'Laatbloeiers Gitaar 21+',
				}),
			],
			[GROUP_A],
		);

		expect(result.groups[0]?.agendaStartDate).toBe('2024-02-29');
		expect(result.groups[0]?.agendaEndDate).toBe('2024-03-01');
		expect(result.groups[0]?.agendaEndTime).toBe('00:27:12');
	});

	it('leaves non-group agreements without a lesson_group id', () => {
		const rows = [
			baseGroupRow({ mongoOid: 'a1', agreementId: 'a1-uuid', studentUserId: STUDENT_1 }),
			baseGroupRow({
				mongoOid: 'solo',
				agreementId: 'solo-uuid',
				studentUserId: STUDENT_3,
				isGroupLesson: false,
				courseName: null,
				courseOid: 'course-solo',
			}),
		];
		const result = attachWithIds(rows, [GROUP_A]);

		expect(result.rows[0]?.lessonGroupId).toBe(GROUP_A);
		expect(result.rows[1]?.lessonGroupId).toBeNull();
	});
});

describe('attachLessonGroupsToAgreementRows different slots', () => {
	it('creates separate groups for different schedule slots', () => {
		const rows = [
			baseGroupRow({ mongoOid: 'a1', agreementId: 'a1-uuid', studentUserId: STUDENT_1 }),
			baseGroupRow({
				mongoOid: 'a2',
				agreementId: 'a2-uuid',
				studentUserId: STUDENT_2,
				dayOfWeek: 4,
				startTime: '18:00:00',
			}),
		];
		const result = attachWithIds(rows, [GROUP_A, GROUP_B]);

		expect(result.groups).toHaveLength(2);
		expect(result.rows[0]?.lessonGroupId).toBe(GROUP_A);
		expect(result.rows[1]?.lessonGroupId).toBe(GROUP_B);
	});

	it('splits biweekly members when latest agenda dates are on opposite phases', () => {
		const rows = [
			baseGroupRow({
				mongoOid: 'phase-a',
				agreementId: 'phase-a-uuid',
				studentUserId: STUDENT_1,
				frequency: 'biweekly',
				startDate: '2026-02-10',
				scheduleSlotDate: '2026-09-15',
				dayOfWeek: 2,
				startTime: '18:00:00',
			}),
			baseGroupRow({
				mongoOid: 'phase-b',
				agreementId: 'phase-b-uuid',
				studentUserId: STUDENT_2,
				frequency: 'biweekly',
				startDate: '2026-10-27',
				scheduleSlotDate: '2026-10-27',
				dayOfWeek: 2,
				startTime: '18:00:00',
			}),
			baseGroupRow({
				mongoOid: 'phase-c',
				agreementId: 'phase-c-uuid',
				studentUserId: STUDENT_3,
				frequency: 'biweekly',
				startDate: '2026-02-10',
				scheduleSlotDate: '2026-09-15',
				dayOfWeek: 2,
				startTime: '18:00:00',
			}),
		];
		const datesByAgreement = new Map<string, readonly string[]>([
			['phase-a', ['2026-09-15', '2027-07-06']],
			['phase-c', ['2026-09-15', '2027-07-06']],
			['phase-b', ['2026-10-27', '2027-07-13']],
		]);
		let nextId = 0;
		const result = attachLessonGroupsToAgreementRows(
			rows,
			createEmptyIdMap(),
			() => {
				const id = [GROUP_A, GROUP_B][nextId++] ?? 'overflow';
				return id;
			},
			datesByAgreement,
		);

		expect(result.groups).toHaveLength(2);
		expect(result.rows[0]?.lessonGroupId).toBe(GROUP_A);
		expect(result.rows[2]?.lessonGroupId).toBe(GROUP_A);
		expect(result.rows[1]?.lessonGroupId).toBe(GROUP_B);
	});

	it('keeps biweekly members together when startDates differ but schedule slots share a phase', () => {
		const rows = [
			baseGroupRow({
				mongoOid: 'member-a',
				agreementId: 'member-a-uuid',
				studentUserId: STUDENT_1,
				frequency: 'biweekly',
				startDate: '2026-02-10',
				scheduleSlotDate: '2026-09-15',
				dayOfWeek: 2,
				startTime: '18:00:00',
			}),
			baseGroupRow({
				mongoOid: 'member-b',
				agreementId: 'member-b-uuid',
				studentUserId: STUDENT_2,
				frequency: 'biweekly',
				startDate: '2026-09-15',
				scheduleSlotDate: '2026-09-15',
				dayOfWeek: 2,
				startTime: '18:00:00',
			}),
		];
		const result = attachWithIds(rows, [GROUP_A, GROUP_B]);

		expect(result.groups).toHaveLength(1);
		expect(result.rows[0]?.lessonGroupId).toBe(GROUP_A);
		expect(result.rows[1]?.lessonGroupId).toBe(GROUP_A);
	});
});

describe('attachLessonGroupsToAgreementRows id-map reuse', () => {
	it('reuses an existing lesson_group id from the id-map', () => {
		const row = baseGroupRow();
		const slotKey = groupLessonSlotKey(row);
		const idMap = setMappedId(createEmptyIdMap(), 'lesson_group', slotKey, GROUP_A);
		const result = attachLessonGroupsToAgreementRows([row], idMap, () => GROUP_B);

		expect(result.groups).toHaveLength(1);
		expect(result.groups[0]?.lessonGroupId).toBe(GROUP_A);
		expect(result.rows[0]?.lessonGroupId).toBe(GROUP_A);
	});
});

describe('coalesceLessonGroupMembers', () => {
	it('merges duplicate student+group memberships into one row', () => {
		const coalesced = coalesceLessonGroupMembers([
			baseGroupRow({
				lessonGroupId: GROUP_A,
				studentUserId: STUDENT_1,
				startDate: '2024-08-29',
				endDate: '2025-07-31',
			}),
			baseGroupRow({
				lessonGroupId: GROUP_A,
				studentUserId: STUDENT_1,
				startDate: '2024-06-01',
				endDate: '2024-07-31',
			}),
			baseGroupRow({
				lessonGroupId: GROUP_A,
				studentUserId: STUDENT_2,
				startDate: '2024-06-13',
				endDate: '2024-08-31',
			}),
		]);

		expect(coalesced).toHaveLength(2);
		expect(coalesced[0]).toEqual({
			lessonGroupId: GROUP_A,
			studentUserId: STUDENT_1,
			joinedDate: '2024-06-01',
			leftDate: '2025-07-31',
		});
		expect(coalesced[1]).toEqual({
			lessonGroupId: GROUP_A,
			studentUserId: STUDENT_2,
			joinedDate: '2024-06-13',
			leftDate: '2024-08-31',
		});
	});

	it('keeps leftDate null when any membership is still open', () => {
		const coalesced = coalesceLessonGroupMembers([
			baseGroupRow({
				lessonGroupId: GROUP_A,
				studentUserId: STUDENT_1,
				startDate: '2024-06-01',
				endDate: '2024-07-31',
			}),
			baseGroupRow({
				lessonGroupId: GROUP_A,
				studentUserId: STUDENT_1,
				startDate: '2024-08-29',
				endDate: null,
			}),
		]);

		expect(coalesced).toHaveLength(1);
		expect(coalesced[0]).toEqual({
			lessonGroupId: GROUP_A,
			studentUserId: STUDENT_1,
			joinedDate: '2024-06-01',
			leftDate: null,
		});
	});
});
