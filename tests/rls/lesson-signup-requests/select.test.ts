import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAnon, createClientAs, createClientBypassRLS } from '../../db';
import type { LessonSignupRequestInsert } from '../../types';
import { expectInsufficientPrivilege, unwrap, unwrapError } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
import { type TestUser, TestUsers } from '../test-users';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

const dbNoRLS = createClientBypassRLS();
const lessonTypeId = fixtures.requireLessonTypeId('Gitaarles');

// Three signup requests we seed and clean up around the test:
//   matchingStudent  → email matches student-009 profile
//   matchingTeacher  → email matches teacher-alice profile
//   external         → unrelated email (no profile)
const seededIds: string[] = [];

async function seedRequest(email: string): Promise<string> {
	const payload: LessonSignupRequestInsert = {
		first_name: 'Test',
		last_name: 'Signup',
		email,
		lesson_type_id: lessonTypeId,
		status: 'pending',
	};
	const [row] = unwrap(await dbNoRLS.from('lesson_signup_requests').insert(payload).select('id'));
	seededIds.push(row.id);
	return row.id;
}

let matchingStudentId: string;
let matchingTeacherId: string;
let externalId: string;

beforeAll(async () => {
	matchingStudentId = await seedRequest(TestUsers.STUDENT_009);
	matchingTeacherId = await seedRequest(TestUsers.TEACHER_ALICE);
	externalId = await seedRequest('outsider-001@popschoolharderwijk.nl');
	initialState = await setupState();
});

afterAll(async () => {
	if (seededIds.length > 0) {
		unwrap(await dbNoRLS.from('lesson_signup_requests').delete().in('id', seededIds));
	}
	await verifyState(initialState);
});

/**
 * lesson_signup_requests SELECT policy:
 *   is_privileged() OR lower(email) = lower(profiles.email of current_user_id())
 *
 * → site_admin / admin / staff: see all
 * → teachers / students / plain users: only requests whose email equals their own profile email
 * → anon: SELECT allowed at table level but RLS yields no rows (INSERT-only public form)
 */
describe('RLS: lesson_signup_requests SELECT - privileged roles see everything', () => {
	async function expectSeesAll(user: TestUser) {
		const db = await createClientAs(user);
		const data = unwrap(await db.from('lesson_signup_requests').select('id'));
		const ids = data.map((r) => r.id);
		expect(ids).toContain(matchingStudentId);
		expect(ids).toContain(matchingTeacherId);
		expect(ids).toContain(externalId);
	}

	it('site_admin sees all requests', () => expectSeesAll(TestUsers.SITE_ADMIN));
	it('admin sees all requests', () => expectSeesAll(TestUsers.ADMIN_ONE));
	it('staff sees all requests', () => expectSeesAll(TestUsers.STAFF_ONE));
});

describe('RLS: lesson_signup_requests SELECT - email-matched access', () => {
	it('student only sees signup requests matching their own email', async () => {
		const db = await createClientAs(TestUsers.STUDENT_009);
		const data = unwrap(await db.from('lesson_signup_requests').select('id, email'));
		const ids = data.map((r) => r.id);
		expect(ids).toContain(matchingStudentId);
		expect(ids).not.toContain(matchingTeacherId);
		expect(ids).not.toContain(externalId);
		for (const row of data) {
			expect(row.email.toLowerCase()).toBe(TestUsers.STUDENT_009);
		}
	});

	it('other student does not see another student email request', async () => {
		const db = await createClientAs(TestUsers.STUDENT_010);
		const data = unwrap(await db.from('lesson_signup_requests').select('id'));
		const ids = data.map((r) => r.id);
		expect(ids).not.toContain(matchingStudentId);
		expect(ids).not.toContain(matchingTeacherId);
		expect(ids).not.toContain(externalId);
	});

	it('teacher only sees signup requests matching their own email', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);
		const data = unwrap(await db.from('lesson_signup_requests').select('id, email'));
		const ids = data.map((r) => r.id);
		expect(ids).toContain(matchingTeacherId);
		expect(ids).not.toContain(matchingStudentId);
		expect(ids).not.toContain(externalId);
		for (const row of data) {
			expect(row.email.toLowerCase()).toBe(TestUsers.TEACHER_ALICE);
		}
	});

	it('teacher without matching email sees nothing extra', async () => {
		const db = await createClientAs(TestUsers.TEACHER_BOB);
		const data = unwrap(await db.from('lesson_signup_requests').select('id'));
		const ids = data.map((r) => r.id);
		expect(ids).not.toContain(matchingStudentId);
		expect(ids).not.toContain(matchingTeacherId);
		expect(ids).not.toContain(externalId);
	});

	it('plain user without matching email sees nothing', async () => {
		const db = await createClientAs(TestUsers.USER_001);
		const data = unwrap(await db.from('lesson_signup_requests').select('id'));
		expect(data).toHaveLength(0);
	});
});

describe('RLS: lesson_signup_requests anon access', () => {
	it('anon select on lesson_signup_requests is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(unwrapError(await db.from('lesson_signup_requests').select('*').limit(1)));
	});

	it('anon CAN INSERT a pending request via the public signup form', async () => {
		const db = createClientAnon();
		const email = `anon-${Date.now()}@popschoolharderwijk.nl`;
		const payload: LessonSignupRequestInsert = {
			first_name: 'Anon',
			last_name: 'Public',
			email,
			lesson_type_id: lessonTypeId,
			status: 'pending',
		};
		// No .select(): anon has no SELECT policy, so INSERT...RETURNING would fail RLS.
		const { error } = await db.from('lesson_signup_requests').insert(payload);
		expect(error).toBeNull();
		const found = unwrap(await dbNoRLS.from('lesson_signup_requests').select('id').eq('email', email));
		expect(found).toHaveLength(1);
		unwrap(await dbNoRLS.from('lesson_signup_requests').delete().eq('id', found[0].id));
	});

	it('anon CANNOT INSERT a non-pending request (WITH CHECK violated)', async () => {
		const db = createClientAnon();
		const payload: LessonSignupRequestInsert = {
			first_name: 'Anon',
			last_name: 'Bad',
			email: `anon-bad-${Date.now()}@popschoolharderwijk.nl`,
			lesson_type_id: lessonTypeId,
			status: 'approved',
		};
		expectInsufficientPrivilege(unwrapError(await db.from('lesson_signup_requests').insert(payload).select()));
	});
});
