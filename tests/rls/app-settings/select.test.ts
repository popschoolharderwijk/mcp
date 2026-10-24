import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs } from '../../db';
import { unwrap } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { APP_SETTINGS } from '../seed-data-constants';
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
 * app_settings SELECT: every authenticated role can read all seeded keys.
 */

async function selectAppSettings(user: TestUser) {
	const db = await createClientAs(user);
	const data = unwrap(await db.from('app_settings').select('key, value').order('key'));
	expect(data).toHaveLength(APP_SETTINGS.KEY_COUNT);
	const byKey = Object.fromEntries(data.map((row) => [row.key, row.value]));
	expect(byKey.school_year).toEqual(APP_SETTINGS.SCHOOL_YEAR);
	expect(byKey.agenda).toEqual(APP_SETTINGS.AGENDA);
	expect(byKey.vat).toEqual(APP_SETTINGS.VAT);
	expect(byKey.branding).toEqual(APP_SETTINGS.BRANDING);
	expect(byKey.trial_lessons).toEqual(APP_SETTINGS.TRIAL_LESSONS);
	expect(byKey.agreements).toEqual(APP_SETTINGS.AGREEMENTS);
	expect(byKey.tips).toEqual(APP_SETTINGS.TIPS);
}

describe('RLS: app_settings SELECT', () => {
	it('site_admin sees all app settings', async () => {
		await selectAppSettings(TestUsers.SITE_ADMIN);
	});

	it('admin sees all app settings', async () => {
		await selectAppSettings(TestUsers.ADMIN_ONE);
	});

	it('staff sees all app settings', async () => {
		await selectAppSettings(TestUsers.STAFF_ONE);
	});

	it('teacher sees all app settings', async () => {
		await selectAppSettings(TestUsers.TEACHER_ALICE);
	});

	it('student sees all app settings', async () => {
		await selectAppSettings(TestUsers.STUDENT_001);
	});

	it('user without role sees all app settings', async () => {
		await selectAppSettings(TestUsers.USER_001);
	});
});
