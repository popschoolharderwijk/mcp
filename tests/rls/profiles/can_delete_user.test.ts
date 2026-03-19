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

describe('RPC: can_delete_user', () => {
	it('returns true for own user id', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const id = fixtures.requireUserId(TestUsers.STUDENT_001);
		expect(unwrap(await db.rpc('can_delete_user', { _target_id: id }))).toBe(true);
	});

	it('returns false when targeting another user (non-admin)', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const other = fixtures.requireUserId(TestUsers.STUDENT_002);
		expect(unwrap(await db.rpc('can_delete_user', { _target_id: other }))).toBe(false);
	});

	it('site_admin returns true for another user id', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);
		const id = fixtures.requireUserId(TestUsers.STUDENT_001);
		expect(unwrap(await db.rpc('can_delete_user', { _target_id: id }))).toBe(true);
	});

	it('staff returns false for a student id', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);
		const id = fixtures.requireUserId(TestUsers.STUDENT_001);
		expect(unwrap(await db.rpc('can_delete_user', { _target_id: id }))).toBe(false);
	});
});
