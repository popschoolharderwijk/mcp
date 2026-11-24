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

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

/**
 * lesson_signup_requests INSERT/UPDATE/DELETE:
 *   INSERT: service_role / bypass only (public signup via edge function)
 *   UPDATE: privileged only (staff/admin/site_admin)
 *   DELETE: privileged only (staff/admin/site_admin)
 */

function newPendingRequest(email: string): LessonSignupRequestInsert {
	return {
		first_name: 'CRUD',
		last_name: 'Test',
		email,
		lesson_type_id: lessonTypeId,
		status: 'pending',
	};
}

async function insertViaService(email: string) {
	const [row] = unwrap(await dbNoRLS.from('lesson_signup_requests').insert(newPendingRequest(email)).select('id'));
	return {
		id: row.id,
		cleanup: async () => {
			unwrap(await dbNoRLS.from('lesson_signup_requests').delete().eq('id', row.id));
		},
	};
}

describe('RLS: lesson_signup_requests INSERT - denied for clients', () => {
	for (const user of [
		TestUsers.STUDENT_009,
		TestUsers.TEACHER_ALICE,
		TestUsers.STAFF_ONE,
		TestUsers.ADMIN_ONE,
		TestUsers.SITE_ADMIN,
		TestUsers.USER_001,
	]) {
		it(`${user} cannot insert a pending request`, async () => {
			const db = await createClientAs(user);
			expectInsufficientPrivilege(
				unwrapError(await db.from('lesson_signup_requests').insert(newPendingRequest(user)).select()),
			);
		});
	}

	it('anon cannot insert a pending request', async () => {
		const db = createClientAnon();
		const payload: LessonSignupRequestInsert = {
			first_name: 'Anon',
			last_name: 'Public',
			email: `anon-${Date.now()}@popschoolharderwijk.nl`,
			lesson_type_id: lessonTypeId,
			status: 'pending',
		};
		expectInsufficientPrivilege(unwrapError(await db.from('lesson_signup_requests').insert(payload)));
	});
});

describe('RLS: lesson_signup_requests UPDATE/DELETE - blocked for non-privileged roles', () => {
	async function blockedUpdate(user: TestUser) {
		const { id, cleanup } = await insertViaService(TestUsers.SITE_ADMIN);
		try {
			const db = await createClientAs(user);
			const data = unwrap(
				await db.from('lesson_signup_requests').update({ first_name: 'Hacker' }).eq('id', id).select(),
			);
			expect(data).toHaveLength(0);
		} finally {
			await cleanup();
		}
	}

	async function blockedDelete(user: TestUser) {
		const { id, cleanup } = await insertViaService(TestUsers.SITE_ADMIN);
		try {
			const db = await createClientAs(user);
			const data = unwrap(await db.from('lesson_signup_requests').delete().eq('id', id).select());
			expect(data).toHaveLength(0);
		} finally {
			await cleanup();
		}
	}

	for (const user of [TestUsers.STUDENT_009, TestUsers.TEACHER_ALICE, TestUsers.USER_001]) {
		it(`${user} cannot UPDATE`, () => blockedUpdate(user));
		it(`${user} cannot DELETE`, () => blockedDelete(user));
	}
});

describe('RLS: lesson_signup_requests UPDATE/DELETE - allowed for privileged roles', () => {
	for (const user of [TestUsers.STAFF_ONE, TestUsers.ADMIN_ONE, TestUsers.SITE_ADMIN]) {
		it(`${user} can UPDATE and DELETE`, async () => {
			const { id } = await insertViaService(TestUsers.SITE_ADMIN);
			const db = await createClientAs(user);
			unwrap(await db.from('lesson_signup_requests').update({ first_name: 'Updated' }).eq('id', id).select());
			unwrap(await db.from('lesson_signup_requests').delete().eq('id', id).select());
		});
	}
});
