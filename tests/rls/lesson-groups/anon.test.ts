import { afterAll, beforeAll, describe, it } from 'bun:test';
import { createClientAnon } from '../../db';
import { expectInsufficientPrivilege, unwrapError } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { LESSON_GROUPS } from '../seed-data-constants';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

describe('RLS: lesson_groups anon', () => {
	it('anon select on lesson_groups is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(unwrapError(await db.from('lesson_groups').select('id')));
	});

	it('anon update on lesson_groups is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(
				await db
					.from('lesson_groups')
					.update({ name: 'Anon' })
					.eq('id', LESSON_GROUPS.BANDCOACHING_ID)
					.select(),
			),
		);
	});

	it('anon delete on lesson_groups is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(await db.from('lesson_groups').delete().eq('id', LESSON_GROUPS.BANDCOACHING_ID).select()),
		);
	});
});

describe('RLS: lesson_group_members anon', () => {
	it('anon select on lesson_group_members is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(unwrapError(await db.from('lesson_group_members').select('id')));
	});

	it('anon delete on lesson_group_members is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(
				await db
					.from('lesson_group_members')
					.delete()
					.eq('lesson_group_id', LESSON_GROUPS.BANDCOACHING_ID)
					.select(),
			),
		);
	});
});
