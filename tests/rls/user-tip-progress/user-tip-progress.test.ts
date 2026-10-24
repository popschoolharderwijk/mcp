import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs } from '../../db';
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

const TIP_ID = 'rls-test-tip';

describe('RLS: user_tip_progress own rows', () => {
	it('user can upsert, read and delete own tip progress', async () => {
		const userId = fixtures.requireUserId(TestUsers.USER_001);
		const db = await createClientAs(TestUsers.USER_001);

		const [inserted] = unwrap(
			await db
				.from('user_tip_progress')
				.upsert(
					{
						user_id: userId,
						tip_id: TIP_ID,
						status: 'dismissed',
						updated_at: new Date().toISOString(),
						last_action_at: null,
					},
					{ onConflict: 'user_id,tip_id' },
				)
				.select('user_id, tip_id, status, last_action_at'),
		);
		expect(inserted).toEqual({
			user_id: userId,
			tip_id: TIP_ID,
			status: 'dismissed',
			last_action_at: null,
		});

		const actedAt = '2026-03-01T12:00:00+00:00';
		const [updated] = unwrap(
			await db
				.from('user_tip_progress')
				.upsert(
					{
						user_id: userId,
						tip_id: TIP_ID,
						status: 'completed',
						updated_at: actedAt,
						last_action_at: actedAt,
					},
					{ onConflict: 'user_id,tip_id' },
				)
				.select('status, last_action_at'),
		);
		expect(updated).toEqual({ status: 'completed', last_action_at: actedAt });

		const rows = unwrap(
			await db.from('user_tip_progress').select('tip_id, status, last_action_at').eq('tip_id', TIP_ID),
		);
		expect(rows).toEqual([{ tip_id: TIP_ID, status: 'completed', last_action_at: actedAt }]);

		const deleted = unwrap(await db.from('user_tip_progress').delete().eq('tip_id', TIP_ID).select('tip_id'));
		expect(deleted).toEqual([{ tip_id: TIP_ID }]);
	});
});

describe('RLS: user_tip_progress other users', () => {
	it('user cannot read another users tip progress', async () => {
		const ownerId = fixtures.requireUserId(TestUsers.USER_001);
		const ownerDb = await createClientAs(TestUsers.USER_001);
		unwrap(
			await ownerDb.from('user_tip_progress').upsert(
				{
					user_id: ownerId,
					tip_id: TIP_ID,
					status: 'completed',
					updated_at: new Date().toISOString(),
				},
				{ onConflict: 'user_id,tip_id' },
			),
		);

		const otherDb = await createClientAs(TestUsers.USER_002);
		const rows = unwrap(await otherDb.from('user_tip_progress').select('tip_id').eq('user_id', ownerId));
		expect(rows).toEqual([]);

		unwrap(await ownerDb.from('user_tip_progress').delete().eq('tip_id', TIP_ID).select('tip_id'));
	});

	it('user cannot update another users tip progress', async () => {
		const ownerId = fixtures.requireUserId(TestUsers.USER_001);
		const ownerDb = await createClientAs(TestUsers.USER_001);
		unwrap(
			await ownerDb.from('user_tip_progress').upsert(
				{
					user_id: ownerId,
					tip_id: TIP_ID,
					status: 'dismissed',
					updated_at: new Date().toISOString(),
				},
				{ onConflict: 'user_id,tip_id' },
			),
		);

		const otherDb = await createClientAs(TestUsers.USER_002);
		const updated = unwrap(
			await otherDb
				.from('user_tip_progress')
				.update({ status: 'completed' })
				.eq('user_id', ownerId)
				.eq('tip_id', TIP_ID)
				.select('tip_id'),
		);
		expect(updated).toEqual([]);

		unwrap(await ownerDb.from('user_tip_progress').delete().eq('tip_id', TIP_ID).select('tip_id'));
	});

	it('user cannot delete another users tip progress', async () => {
		const ownerId = fixtures.requireUserId(TestUsers.USER_001);
		const ownerDb = await createClientAs(TestUsers.USER_001);
		unwrap(
			await ownerDb.from('user_tip_progress').upsert(
				{
					user_id: ownerId,
					tip_id: TIP_ID,
					status: 'dismissed',
					updated_at: new Date().toISOString(),
				},
				{ onConflict: 'user_id,tip_id' },
			),
		);

		const otherDb = await createClientAs(TestUsers.USER_002);
		const deleted = unwrap(
			await otherDb
				.from('user_tip_progress')
				.delete()
				.eq('user_id', ownerId)
				.eq('tip_id', TIP_ID)
				.select('tip_id'),
		);
		expect(deleted).toEqual([]);

		unwrap(await ownerDb.from('user_tip_progress').delete().eq('tip_id', TIP_ID).select('tip_id'));
	});

	it('user cannot upsert tip progress for another user', async () => {
		const ownerId = fixtures.requireUserId(TestUsers.USER_001);
		const otherDb = await createClientAs(TestUsers.USER_002);
		expectInsufficientPrivilege(
			unwrapError(
				await otherDb.from('user_tip_progress').insert({
					user_id: ownerId,
					tip_id: TIP_ID,
					status: 'completed',
					updated_at: new Date().toISOString(),
				}),
			),
		);
	});
});
