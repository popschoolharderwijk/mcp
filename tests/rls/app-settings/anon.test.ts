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

describe('RLS: app_settings anon', () => {
	it('anon select on app_settings is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(unwrapError(await db.from('app_settings').select('*')));
	});

	it('anon insert on app_settings is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(await db.from('app_settings').insert({ key: 'anon_probe', value: {} }).select()),
		);
	});

	it('anon update on app_settings is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(await db.from('app_settings').update({ value: {} }).eq('key', 'school_year').select()),
		);
	});

	it('anon delete on app_settings is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(await db.from('app_settings').delete().eq('key', 'school_year').select()),
		);
	});
});
