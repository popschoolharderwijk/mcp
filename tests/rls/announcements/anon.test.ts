import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAnon } from '../../db';
import { expectInsufficientPrivilege, unwrap, unwrapError } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { ANNOUNCEMENTS } from '../seed-data-constants';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

/**
 * announcements anon: SELECT is limited to published + active rows.
 * No write policy targets anon, so INSERT is rejected and UPDATE/DELETE match zero rows.
 */
describe('RLS: announcements anon', () => {
	it('anon sees only the published announcement', async () => {
		const db = createClientAnon();
		const data = unwrap(await db.from('announcements').select('id'));
		expect(data).toEqual([{ id: ANNOUNCEMENTS.PUBLISHED_ID }]);
	});

	it('anon insert on announcements is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(await db.from('announcements').insert({ title: 'Anon', body: 'Anon' }).select()),
		);
	});

	it('anon update on announcements affects no rows', async () => {
		const db = createClientAnon();
		const data = unwrap(
			await db.from('announcements').update({ title: 'Anon' }).eq('id', ANNOUNCEMENTS.PUBLISHED_ID).select('id'),
		);
		expect(data).toHaveLength(0);
	});

	it('anon delete on announcements affects no rows', async () => {
		const db = createClientAnon();
		const data = unwrap(await db.from('announcements').delete().eq('id', ANNOUNCEMENTS.PUBLISHED_ID).select('id'));
		expect(data).toHaveLength(0);
	});
});
