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

describe('RLS: email_templates anon', () => {
	it('anon select on email_templates is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(unwrapError(await db.from('email_templates').select('*')));
	});

	it('anon insert on email_templates is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(
				await db
					.from('email_templates')
					.insert({ event_key: 'anon_probe', subject: 'x', body_markdown: 'x' })
					.select(),
			),
		);
	});

	it('anon update on email_templates is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(
				await db.from('email_templates').update({ subject: 'x' }).eq('event_key', 'signup_received').select(),
			),
		);
	});

	it('anon delete on email_templates is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(await db.from('email_templates').delete().eq('event_key', 'signup_received').select()),
		);
	});
});
