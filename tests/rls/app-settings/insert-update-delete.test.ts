import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs } from '../../db';
import { expectInsufficientPrivilege, unwrap, unwrapError, unwrapSingleRow } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
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
 * app_settings writes: only site_admin may INSERT / UPDATE / DELETE.
 * admin (non-site) and other roles are denied.
 */

const TEMP_KEY = 'rls_app_settings_temp';
const TEMP_VALUE = { probe: true };

async function expectInsertBlocked(user: TestUser) {
	const db = await createClientAs(user);
	expectInsufficientPrivilege(
		unwrapError(await db.from('app_settings').insert({ key: TEMP_KEY, value: TEMP_VALUE }).select()),
	);
}

async function expectUpdateBlocked(user: TestUser) {
	const db = await createClientAs(user);
	const data = unwrap(
		await db
			.from('app_settings')
			.update({ value: { start_month: 1, end_month: 12 } })
			.eq('key', 'school_year')
			.select(),
	);
	expect(data).toHaveLength(0);

	const verify = unwrapSingleRow(await db.from('app_settings').select('value').eq('key', 'school_year').single());
	expect(verify.value).toEqual(APP_SETTINGS.SCHOOL_YEAR);
}

async function expectDeleteBlocked(user: TestUser) {
	const db = await createClientAs(user);
	const data = unwrap(await db.from('app_settings').delete().eq('key', 'school_year').select());
	expect(data).toHaveLength(0);

	const remaining = unwrap(await db.from('app_settings').select('key').eq('key', 'school_year'));
	expect(remaining).toHaveLength(1);
}

describe('RLS: app_settings INSERT - blocked for non-site-admin', () => {
	it('admin cannot insert app setting', async () => {
		await expectInsertBlocked(TestUsers.ADMIN_ONE);
	});

	it('staff cannot insert app setting', async () => {
		await expectInsertBlocked(TestUsers.STAFF_ONE);
	});

	it('teacher cannot insert app setting', async () => {
		await expectInsertBlocked(TestUsers.TEACHER_ALICE);
	});

	it('student cannot insert app setting', async () => {
		await expectInsertBlocked(TestUsers.STUDENT_001);
	});

	it('user without role cannot insert app setting', async () => {
		await expectInsertBlocked(TestUsers.USER_001);
	});
});

describe('RLS: app_settings UPDATE - blocked for non-site-admin', () => {
	it('admin cannot update app setting', async () => {
		await expectUpdateBlocked(TestUsers.ADMIN_ONE);
	});

	it('staff cannot update app setting', async () => {
		await expectUpdateBlocked(TestUsers.STAFF_ONE);
	});

	it('teacher cannot update app setting', async () => {
		await expectUpdateBlocked(TestUsers.TEACHER_ALICE);
	});

	it('student cannot update app setting', async () => {
		await expectUpdateBlocked(TestUsers.STUDENT_001);
	});
});

describe('RLS: app_settings DELETE - blocked for non-site-admin', () => {
	it('admin cannot delete app setting', async () => {
		await expectDeleteBlocked(TestUsers.ADMIN_ONE);
	});

	it('staff cannot delete app setting', async () => {
		await expectDeleteBlocked(TestUsers.STAFF_ONE);
	});

	it('teacher cannot delete app setting', async () => {
		await expectDeleteBlocked(TestUsers.TEACHER_ALICE);
	});

	it('student cannot delete app setting', async () => {
		await expectDeleteBlocked(TestUsers.STUDENT_001);
	});
});

describe('RLS: app_settings writes - site_admin allowed', () => {
	it('site_admin can insert and delete a temporary key', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);
		const [inserted] = unwrap(
			await db.from('app_settings').insert({ key: TEMP_KEY, value: TEMP_VALUE }).select('key, value'),
		);
		expect(inserted.key).toBe(TEMP_KEY);
		expect(inserted.value).toEqual(TEMP_VALUE);

		const deleted = unwrap(await db.from('app_settings').delete().eq('key', TEMP_KEY).select('key'));
		expect(deleted).toHaveLength(1);
		expect(deleted[0].key).toBe(TEMP_KEY);
	});

	it('site_admin can update school_year and restore bootstrap value', async () => {
		const siteAdminId = fixtures.requireUserId(TestUsers.SITE_ADMIN);
		const db = await createClientAs(TestUsers.SITE_ADMIN);
		const nextValue = { start_month: 1, end_month: 12 };

		const updated = unwrap(
			await db
				.from('app_settings')
				.update({ value: nextValue })
				.eq('key', 'school_year')
				.select('key, value, updated_by'),
		);
		expect(updated).toHaveLength(1);
		expect(updated[0].value).toEqual(nextValue);
		expect(updated[0].updated_by).toBe(siteAdminId);

		const restored = unwrap(
			await db
				.from('app_settings')
				.update({ value: APP_SETTINGS.SCHOOL_YEAR })
				.eq('key', 'school_year')
				.select('value'),
		);
		expect(restored).toHaveLength(1);
		expect(restored[0].value).toEqual(APP_SETTINGS.SCHOOL_YEAR);
	});
});
