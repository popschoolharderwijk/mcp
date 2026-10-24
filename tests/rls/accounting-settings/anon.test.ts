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

describe('RLS: accounting_settings anon', () => {
	it('anon select on accounting_settings is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(unwrapError(await db.from('accounting_settings').select('*')));
	});

	it('anon insert on accounting_settings is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(unwrapError(await db.from('accounting_settings').insert({ id: true }).select()));
	});

	it('anon update on accounting_settings is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(
				await db.from('accounting_settings').update({ journal_code_memorial: '99' }).eq('id', true).select(),
			),
		);
	});

	it('anon delete on accounting_settings is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(unwrapError(await db.from('accounting_settings').delete().eq('id', true).select()));
	});
});
