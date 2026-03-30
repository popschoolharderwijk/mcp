import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs } from '../../db';
import { unwrap } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
import { TestUsers } from '../test-users';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

const wideRange = {
	p_start_date: '2020-01-01',
	p_end_date: '2030-12-31',
};

/** ISO date strings (YYYY-MM-DD); lexicographic order matches chronological. */
function maxIsoDate(a: string, b: string): string {
	return a >= b ? a : b;
}

function minIsoDate(a: string, b: string): string {
	return a <= b ? a : b;
}

/** Count calendar days in [start, end] whose Sunday=0 … Saturday=6 matches `targetDow` (PostgreSQL EXTRACT(DOW)). */
function countDaysOfWeekInInclusiveRange(start: string, end: string, targetDow: number): number {
	let n = 0;
	const d = new Date(`${start}T12:00:00.000Z`);
	const endD = new Date(`${end}T12:00:00.000Z`);
	while (d <= endD) {
		if (d.getUTCDay() === targetDow) n++;
		d.setUTCDate(d.getUTCDate() + 1);
	}
	return n;
}

function firstDayOfWeekInInclusiveRange(start: string, end: string, targetDow: number): string | null {
	const d = new Date(`${start}T12:00:00.000Z`);
	const endD = new Date(`${end}T12:00:00.000Z`);
	while (d <= endD) {
		if (d.getUTCDay() === targetDow) {
			return d.toISOString().slice(0, 10);
		}
		d.setUTCDate(d.getUTCDate() + 1);
	}
	return null;
}

/** Age bucket used by get_hours_report (PostgreSQL AGE(occurrence_date, date_of_birth)). */
function ageCategoryOnOccurrenceDate(studentUserId: string, occurrenceIso: string): 'under_21' | '21_plus' | 'unknown' {
	const st = fixtures.allStudents.find((s) => s.user_id === studentUserId);
	if (!st?.date_of_birth) return 'unknown';
	const occ = new Date(`${occurrenceIso}T12:00:00.000Z`);
	const dob = new Date(`${st.date_of_birth}T12:00:00.000Z`);
	let age = occ.getUTCFullYear() - dob.getUTCFullYear();
	const m = occ.getUTCMonth() - dob.getUTCMonth();
	if (m < 0 || (m === 0 && occ.getUTCDate() < dob.getUTCDate())) age--;
	return age >= 21 ? '21_plus' : 'under_21';
}

type HoursReportRow = {
	source_type: string;
	teacher_user_id: string | null;
	lesson_type_id?: string;
	lesson_count?: number;
	total_minutes?: number;
	age_category?: string;
};

function rowsFromReport(raw: unknown): HoursReportRow[] {
	const body = raw as { data?: unknown };
	if (!Array.isArray(body.data)) return [];
	return body.data as HoursReportRow[];
}

/** Calendar days between two ISO dates (matches PostgreSQL `date - date` for whole dates). */
function calendarDaysBetween(startIso: string, endIso: string): number {
	const a = new Date(`${startIso}T12:00:00.000Z`);
	const b = new Date(`${endIso}T12:00:00.000Z`);
	return Math.round((b.getTime() - a.getTime()) / 86400000);
}

type LessonAgg = {
	lesson_type_id: string;
	age_category: string;
	lesson_count: number;
	total_minutes: number;
};

/** Mirrors get_hours_report agreement_occurrences + aggregation for one calendar day (same frequency rules as SQL). */
function expectedLessonAggregatesForTeacherOnDate(teacherUserId: string, occurrenceIso: string): LessonAgg[] {
	const dow = new Date(`${occurrenceIso}T12:00:00.000Z`).getUTCDay();
	const map = new Map<string, LessonAgg>();
	for (const la of fixtures.allLessonAgreements) {
		if (la.teacher_user_id !== teacherUserId) continue;
		if (la.day_of_week !== dow) continue;
		if (occurrenceIso < la.start_date) continue;
		if (la.end_date != null && occurrenceIso > la.end_date) continue;
		if (la.frequency === 'biweekly') {
			const days = calendarDaysBetween(la.start_date, occurrenceIso);
			if (days % 14 !== 0) continue;
		} else if (la.frequency === 'monthly') {
			const days = calendarDaysBetween(la.start_date, occurrenceIso);
			if (days % 28 !== 0) continue;
		}
		const age = ageCategoryOnOccurrenceDate(la.student_user_id, occurrenceIso);
		const key = `${la.lesson_type_id}:${age}`;
		const cur = map.get(key) ?? {
			lesson_type_id: la.lesson_type_id,
			age_category: age,
			lesson_count: 0,
			total_minutes: 0,
		};
		cur.lesson_count += 1;
		cur.total_minutes += la.duration_minutes;
		map.set(key, cur);
	}
	return [...map.values()].sort((a, b) => {
		const c = a.lesson_type_id.localeCompare(b.lesson_type_id);
		if (c !== 0) return c;
		return a.age_category.localeCompare(b.age_category);
	});
}

describe('RPC: get_hours_report', () => {
	it('staff receives json with data array', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);
		const raw = unwrap(await db.rpc('get_hours_report', wideRange));
		expect(raw && typeof raw === 'object').toBe(true);
		const body = raw as { data: unknown };
		expect(Array.isArray(body.data)).toBe(true);
	});

	it('teacher with p_teacher_user_id returns json with data array', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);
		const aliceId = fixtures.requireTeacherId(TestUsers.TEACHER_ALICE);
		const raw = unwrap(
			await db.rpc('get_hours_report', {
				...wideRange,
				p_teacher_user_id: aliceId,
			}),
		);
		const body = raw as { data: unknown };
		expect(Array.isArray(body.data)).toBe(true);
	});

	it('student call succeeds with structured payload', async () => {
		const db = await createClientAs(TestUsers.STUDENT_020);
		const raw = unwrap(await db.rpc('get_hours_report', wideRange));
		const body = raw as { data: unknown };
		expect(Array.isArray(body.data)).toBe(true);
	});

	it('student 020: one aggregated lesson row for weekly Drumles with Alice (wide range ∩ agreement dates)', async () => {
		const db = await createClientAs(TestUsers.STUDENT_020);
		const studentId = fixtures.requireUserId(TestUsers.STUDENT_020);
		const aliceId = fixtures.requireTeacherId(TestUsers.TEACHER_ALICE);
		const drumlesId = fixtures.requireLessonTypeId('Drumles');

		const agreement = fixtures.allLessonAgreements.find(
			(la) => la.student_user_id === studentId && la.teacher_user_id === aliceId,
		);
		if (!agreement?.start_date) throw new Error('seed: expected student-020 ↔ Alice Drumles agreement');

		const endCap = agreement.end_date ?? wideRange.p_end_date;
		const s = maxIsoDate(wideRange.p_start_date, agreement.start_date);
		const e = minIsoDate(wideRange.p_end_date, endCap);
		const mondaysInWindow = countDaysOfWeekInInclusiveRange(s, e, 1);
		const ageCat = ageCategoryOnOccurrenceDate(studentId, s);

		const raw = unwrap(await db.rpc('get_hours_report', wideRange));
		const lessonRows = rowsFromReport(raw).filter((r) => r.source_type === 'lesson');

		expect(lessonRows).toEqual([
			expect.objectContaining({
				source_type: 'lesson',
				teacher_user_id: aliceId,
				lesson_type_id: drumlesId,
				lesson_count: mondaysInWindow,
				total_minutes: 30 * mondaysInWindow,
				age_category: ageCat,
			}),
		]);
	});

	it('student 020: no lesson rows reference teachers they have no agreement with', async () => {
		const db = await createClientAs(TestUsers.STUDENT_020);
		const bobId = fixtures.requireTeacherId(TestUsers.TEACHER_BOB);
		const aliceId = fixtures.requireTeacherId(TestUsers.TEACHER_ALICE);

		const raw = unwrap(await db.rpc('get_hours_report', wideRange));
		const lessonRows = rowsFromReport(raw).filter((r) => r.source_type === 'lesson');

		expect(lessonRows.map((r) => r.teacher_user_id)).toEqual([aliceId]);
		expect(lessonRows.some((r) => r.teacher_user_id === bobId)).toBe(false);
	});

	it('teacher Alice on one Monday: lesson rows match seed (aggregated by type + age)', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);
		const aliceId = fixtures.requireTeacherId(TestUsers.TEACHER_ALICE);
		const studentId = fixtures.requireUserId(TestUsers.STUDENT_020);
		const agreement = fixtures.allLessonAgreements.find(
			(la) => la.student_user_id === studentId && la.teacher_user_id === aliceId,
		);
		if (!agreement?.start_date) throw new Error('seed: student-020 ↔ Alice agreement');
		const endCap = agreement.end_date ?? '2099-12-31';
		const monday = firstDayOfWeekInInclusiveRange(agreement.start_date, endCap, 1);
		if (monday == null) throw new Error('seed: Monday in student-020 agreement window');

		const expected = expectedLessonAggregatesForTeacherOnDate(aliceId, monday);

		const raw = unwrap(
			await db.rpc('get_hours_report', {
				p_start_date: monday,
				p_end_date: monday,
				p_teacher_user_id: aliceId,
			}),
		);
		const lessonRows = rowsFromReport(raw)
			.filter((r) => r.source_type === 'lesson')
			.sort((a, b) => {
				const c = (a.lesson_type_id ?? '').localeCompare(b.lesson_type_id ?? '');
				if (c !== 0) return c;
				return (a.age_category ?? '').localeCompare(b.age_category ?? '');
			});

		expect(lessonRows.length).toBe(expected.length);
		for (let i = 0; i < expected.length; i++) {
			expect(lessonRows[i]).toEqual(
				expect.objectContaining({
					source_type: 'lesson',
					teacher_user_id: aliceId,
					lesson_type_id: expected[i].lesson_type_id,
					age_category: expected[i].age_category,
					lesson_count: expected[i].lesson_count,
					total_minutes: expected[i].total_minutes,
				}),
			);
		}
	});

	it('teacher Alice filtering by Bob teacher id yields no lesson rows', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);
		const bobId = fixtures.requireTeacherId(TestUsers.TEACHER_BOB);
		const raw = unwrap(
			await db.rpc('get_hours_report', {
				...wideRange,
				p_teacher_user_id: bobId,
			}),
		);
		const lessonRows = rowsFromReport(raw).filter((r) => r.source_type === 'lesson');
		expect(lessonRows).toEqual([]);
	});

	it('staff report includes Alice and Bob as lesson teachers (seed has weekly agreements for both)', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);
		const aliceId = fixtures.requireTeacherId(TestUsers.TEACHER_ALICE);
		const bobId = fixtures.requireTeacherId(TestUsers.TEACHER_BOB);

		const raw = unwrap(await db.rpc('get_hours_report', wideRange));
		const lessonRows = rowsFromReport(raw).filter((r) => r.source_type === 'lesson');
		const teacherIds = new Set(lessonRows.map((r) => r.teacher_user_id).filter((id): id is string => id != null));

		expect(teacherIds.has(aliceId)).toBe(true);
		expect(teacherIds.has(bobId)).toBe(true);
	});

	it('single Monday: student 020 sees exactly one occurrence (weekly Drumles)', async () => {
		const db = await createClientAs(TestUsers.STUDENT_020);
		const studentId = fixtures.requireUserId(TestUsers.STUDENT_020);
		const aliceId = fixtures.requireTeacherId(TestUsers.TEACHER_ALICE);
		const drumlesId = fixtures.requireLessonTypeId('Drumles');

		const agreement = fixtures.allLessonAgreements.find(
			(la) => la.student_user_id === studentId && la.teacher_user_id === aliceId,
		);
		if (!agreement?.start_date) throw new Error('seed: expected student-020 ↔ Alice agreement');

		const endCap = agreement.end_date ?? '2099-12-31';
		const monday = firstDayOfWeekInInclusiveRange(agreement.start_date, endCap, 1);
		if (monday == null) throw new Error('seed: expected a Monday in student-020 Drumles agreement window');

		const raw = unwrap(
			await db.rpc('get_hours_report', {
				p_start_date: monday,
				p_end_date: monday,
			}),
		);
		const lessonRows = rowsFromReport(raw).filter((r) => r.source_type === 'lesson');
		const ageCat = ageCategoryOnOccurrenceDate(studentId, monday);

		expect(lessonRows).toEqual([
			expect.objectContaining({
				source_type: 'lesson',
				teacher_user_id: aliceId,
				lesson_type_id: drumlesId,
				lesson_count: 1,
				total_minutes: 30,
				age_category: ageCat,
			}),
		]);
	});
});
