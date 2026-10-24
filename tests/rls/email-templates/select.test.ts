import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs } from '../../db';
import { unwrap } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { EMAIL_TEMPLATES } from '../seed-data-constants';
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
 * email_templates SELECT: every authenticated role can read seeded templates.
 */

async function selectEmailTemplates(user: TestUser) {
	const db = await createClientAs(user);
	const data = unwrap(
		await db.from('email_templates').select('event_key, subject, body_markdown').order('event_key'),
	);
	expect(data).toHaveLength(EMAIL_TEMPLATES.TOTAL);
	expect(data.map((row) => row.event_key)).toEqual([...EMAIL_TEMPLATES.EVENT_KEYS]);
	const byKey = Object.fromEntries(data.map((row) => [row.event_key, row]));
	expect(byKey.agreement_created).toEqual({
		event_key: 'agreement_created',
		...EMAIL_TEMPLATES.BY_KEY.agreement_created,
	});
	expect(byKey.agreement_created_teacher).toEqual({
		event_key: 'agreement_created_teacher',
		...EMAIL_TEMPLATES.BY_KEY.agreement_created_teacher,
	});
	expect(byKey.signup_received).toEqual({
		event_key: 'signup_received',
		...EMAIL_TEMPLATES.BY_KEY.signup_received,
	});
	expect(byKey.trial_scheduled).toEqual({
		event_key: 'trial_scheduled',
		...EMAIL_TEMPLATES.BY_KEY.trial_scheduled,
	});
	expect(byKey.trial_scheduled_teacher).toEqual({
		event_key: 'trial_scheduled_teacher',
		...EMAIL_TEMPLATES.BY_KEY.trial_scheduled_teacher,
	});
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
