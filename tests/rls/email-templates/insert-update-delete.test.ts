import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs } from '../../db';
import { expectInsufficientPrivilege, unwrap, unwrapError, unwrapSingleRow } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
import { type TestUser, TestUsers } from '../test-users';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

/**
 * email_templates writes: only site_admin may INSERT / UPDATE / DELETE.
 * admin (non-site) and other roles are denied.
 */

const TEMP_KEY = 'rls_email_templates_temp';
const EVENT_KEY = 'signup_received';

async function expectInsertBlocked(user: TestUser) {
	const db = await createClientAs(user);
	expectInsufficientPrivilege(
		unwrapError(
			await db
				.from('email_templates')
				.insert({
					event_key: TEMP_KEY,
					subject: 'temp',
					body_markdown: 'temp',
				})
				.select(),
		),
	);
}

async function expectUpdateBlocked(user: TestUser) {
	const db = await createClientAs(user);
	const before = unwrapSingleRow(
		await db.from('email_templates').select('subject').eq('event_key', EVENT_KEY).single(),
	);
	const data = unwrap(
		await db
			.from('email_templates')
			.update({ subject: 'RLS probe — must not stick' })
			.eq('event_key', EVENT_KEY)
			.select(),
	);
	expect(data).toHaveLength(0);

	const verify = unwrapSingleRow(
		await db.from('email_templates').select('subject').eq('event_key', EVENT_KEY).single(),
	);
	expect(verify.subject).toBe(before.subject);
}

async function expectDeleteBlocked(user: TestUser) {
	const db = await createClientAs(user);
	const data = unwrap(await db.from('email_templates').delete().eq('event_key', EVENT_KEY).select());
	expect(data).toHaveLength(0);

	const remaining = unwrap(await db.from('email_templates').select('event_key').eq('event_key', EVENT_KEY));
	expect(remaining).toHaveLength(1);
}

describe('RLS: email_templates INSERT - blocked for non-site-admin', () => {
	it('admin cannot insert email template', async () => {
		await expectInsertBlocked(TestUsers.ADMIN_ONE);
	});

	it('staff cannot insert email template', async () => {
		await expectInsertBlocked(TestUsers.STAFF_ONE);
	});

	it('teacher cannot insert email template', async () => {
		await expectInsertBlocked(TestUsers.TEACHER_ALICE);
	});

	it('student cannot insert email template', async () => {
		await expectInsertBlocked(TestUsers.STUDENT_001);
	});

	it('user without role cannot insert email template', async () => {
		await expectInsertBlocked(TestUsers.USER_001);
	});
});

describe('RLS: email_templates UPDATE - blocked for non-site-admin', () => {
	it('admin cannot update email template', async () => {
		await expectUpdateBlocked(TestUsers.ADMIN_ONE);
	});

	it('staff cannot update email template', async () => {
		await expectUpdateBlocked(TestUsers.STAFF_ONE);
	});

	it('teacher cannot update email template', async () => {
		await expectUpdateBlocked(TestUsers.TEACHER_ALICE);
	});

	it('student cannot update email template', async () => {
		await expectUpdateBlocked(TestUsers.STUDENT_001);
	});
});

describe('RLS: email_templates DELETE - blocked for non-site-admin', () => {
	it('admin cannot delete email template', async () => {
		await expectDeleteBlocked(TestUsers.ADMIN_ONE);
	});

	it('staff cannot delete email template', async () => {
		await expectDeleteBlocked(TestUsers.STAFF_ONE);
	});

	it('teacher cannot delete email template', async () => {
		await expectDeleteBlocked(TestUsers.TEACHER_ALICE);
	});

	it('student cannot delete email template', async () => {
		await expectDeleteBlocked(TestUsers.STUDENT_001);
	});
});

describe('RLS: email_templates writes - site_admin allowed', () => {
	it('site_admin can insert and delete a temporary template', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);
		const [inserted] = unwrap(
			await db
				.from('email_templates')
				.insert({
					event_key: TEMP_KEY,
					subject: 'temp',
					body_markdown: 'temp body',
				})
				.select('event_key, subject'),
		);
		expect(inserted.event_key).toBe(TEMP_KEY);
		expect(inserted.subject).toBe('temp');

		const deleted = unwrap(await db.from('email_templates').delete().eq('event_key', TEMP_KEY).select('event_key'));
		expect(deleted).toHaveLength(1);
		expect(deleted[0].event_key).toBe(TEMP_KEY);
	});

	it('site_admin can update signup_received subject and restore it', async () => {
		const siteAdminId = fixtures.requireUserId(TestUsers.SITE_ADMIN);
		const db = await createClientAs(TestUsers.SITE_ADMIN);
		const original = unwrapSingleRow(
			await db.from('email_templates').select('subject').eq('event_key', EVENT_KEY).single(),
		);

		const updated = unwrap(
			await db
				.from('email_templates')
				.update({ subject: 'RLS update probe' })
				.eq('event_key', EVENT_KEY)
				.select('event_key, subject, updated_by'),
		);
		expect(updated).toHaveLength(1);
		expect(updated[0].subject).toBe('RLS update probe');
		expect(updated[0].updated_by).toBe(siteAdminId);

		const restored = unwrap(
			await db
				.from('email_templates')
				.update({ subject: original.subject })
				.eq('event_key', EVENT_KEY)
				.select('subject'),
		);
		expect(restored).toHaveLength(1);
		expect(restored[0].subject).toBe(original.subject);
	});
});
