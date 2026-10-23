import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs } from '../../db';
import { unwrap } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { type TestUser, TestUsers } from '../test-users';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

const SEEDED_EVENT_KEYS = [
	'signup_received',
	'trial_scheduled',
	'trial_scheduled_teacher',
	'agreement_created',
	'agreement_created_teacher',
] as const;

/**
 * email_templates SELECT: every authenticated role can read seeded templates.
 */

async function selectEmailTemplates(user: TestUser) {
	const db = await createClientAs(user);
	const data = unwrap(
		await db.from('email_templates').select('event_key, subject, body_markdown').order('event_key'),
	);
	expect(data).toHaveLength(SEEDED_EVENT_KEYS.length);
	const keys = data.map((row) => row.event_key);
	expect(keys).toEqual([
		'agreement_created',
		'agreement_created_teacher',
		'signup_received',
		'trial_scheduled',
		'trial_scheduled_teacher',
	]);
	expect(data[0].body_markdown).not.toBe('');
	expect(data[1].body_markdown).not.toBe('');
	expect(data[2].body_markdown).not.toBe('');
	expect(data[3].body_markdown).not.toBe('');
	expect(data[4].body_markdown).not.toBe('');
}

describe('RLS: email_templates SELECT', () => {
	it('site_admin sees all email templates', async () => {
		await selectEmailTemplates(TestUsers.SITE_ADMIN);
	});

	it('admin sees all email templates', async () => {
		await selectEmailTemplates(TestUsers.ADMIN_ONE);
	});

	it('staff sees all email templates', async () => {
		await selectEmailTemplates(TestUsers.STAFF_ONE);
	});

	it('teacher sees all email templates', async () => {
		await selectEmailTemplates(TestUsers.TEACHER_ALICE);
	});

	it('student sees all email templates', async () => {
		await selectEmailTemplates(TestUsers.STUDENT_001);
	});

	it('user without role sees all email templates', async () => {
		await selectEmailTemplates(TestUsers.USER_001);
	});
});
