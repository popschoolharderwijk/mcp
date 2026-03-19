import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAnon, createClientAs } from '../../db';
import { expectInsufficientPrivilege, unwrap, unwrapError } from '../../utils';
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
		const aliceId = fixtures.requireUserId(TestUsers.TEACHER_ALICE);
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
		const db = await createClientAs(TestUsers.STUDENT_001);
		const raw = unwrap(await db.rpc('get_hours_report', wideRange));
		const body = raw as { data: unknown };
		expect(Array.isArray(body.data)).toBe(true);
	});

	it('anonymous client is rejected', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(unwrapError(await db.rpc('get_hours_report', wideRange)));
	});
});
