import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAnon } from '../../db';
import type { LessonTypeInsert } from '../../types';
import { expectInsufficientPrivilege, unwrap, unwrapError } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { LESSON_TYPES } from '../seed-data-constants';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

/**
 * Public signup (/signup): anon may SELECT active lesson types.
 * INSERT is denied (no policy). UPDATE/DELETE match no rows under RLS (empty result, no error).
 */
describe('RLS: anonymous user – lesson_types', () => {
	it('anon can read active lesson types', async () => {
		const db = createClientAnon();
		const data = unwrap(await db.from('lesson_types').select('id, is_active'));
		expect(data).toHaveLength(LESSON_TYPES.ACTIVE);
		for (const row of data) {
			expect(row.is_active).toBe(true);
		}
	});

	it('anon cannot insert lesson_types', async () => {
		const db = createClientAnon();
		const newLessonType: LessonTypeInsert = {
			name: 'Hacked Lesson Type',
			icon: 'test',
			color: '#FF0000',
		};
		expectInsufficientPrivilege(unwrapError(await db.from('lesson_types').insert(newLessonType).select()));
	});

	it('anon update affects no lesson_types rows', async () => {
		const db = createClientAnon();
		const data = unwrap(await db.from('lesson_types').update({ name: 'Hacked' }).neq('name', 'Hacked').select());
		expect(data).toHaveLength(0);
	});

	it('anon delete affects no lesson_types rows', async () => {
		const db = createClientAnon();
		const data = unwrap(
			await db.from('lesson_types').delete().neq('id', '00000000-0000-0000-0000-000000000000').select(),
		);
		expect(data).toHaveLength(0);
	});
});
