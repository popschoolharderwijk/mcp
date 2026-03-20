import { afterAll, beforeAll, describe, it } from 'bun:test';
import { createClientAnon } from '../../db';
import { expectInsufficientPrivilege, unwrapError } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

describe('RLS: anonymous user – get_hours_report', () => {
	it('anon cannot call get_hours_report', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(
				await db.rpc('get_hours_report', {
					p_start_date: '2020-01-01',
					p_end_date: '2030-12-31',
				}),
			),
		);
	});
});
