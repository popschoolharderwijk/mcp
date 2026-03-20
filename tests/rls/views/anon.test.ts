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

describe('RLS: anonymous user – view_profiles_with_display_name', () => {
	it('anon cannot select from view_profiles_with_display_name', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(unwrapError(await db.from('view_profiles_with_display_name').select('*')));
	});
});
