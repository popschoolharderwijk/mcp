import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAnon } from '../../db';
import type { LessonTypeOptionInsert } from '../../types';
import { expectInsufficientPrivilege, unwrap, unwrapError } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { LESSON_TYPE_OPTIONS } from '../seed-data-constants';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

const fakeId = '00000000-0000-0000-0000-000000000001';

/**
 * Public signup (/signup): anon may SELECT options for active lesson types.
 * INSERT is denied. UPDATE/DELETE match no rows under RLS (empty result, no error).
 */
describe('RLS: anonymous user – lesson_type_options', () => {
	it('anon can select lesson_type_options for active lesson types', async () => {
		const db = createClientAnon();
		const data = unwrap(await db.from('lesson_type_options').select('id'));
		expect(data).toHaveLength(LESSON_TYPE_OPTIONS.TOTAL);
	});

	it('anon cannot insert lesson_type_options', async () => {
		const db = createClientAnon();
		const row: LessonTypeOptionInsert = {
			lesson_type_id: fakeId,
			duration_minutes: 60,
			frequency: 'weekly',
			price_per_lesson: 10,
		};
		expectInsufficientPrivilege(unwrapError(await db.from('lesson_type_options').insert(row).select()));
	});

	it('anon update affects no lesson_type_options rows', async () => {
		const db = createClientAnon();
		const data = unwrap(
			await db.from('lesson_type_options').update({ price_per_lesson: 99 }).neq('id', fakeId).select(),
		);
		expect(data).toHaveLength(0);
	});

	it('anon delete affects no lesson_type_options rows', async () => {
		const db = createClientAnon();
		const data = unwrap(await db.from('lesson_type_options').delete().neq('id', fakeId).select());
		expect(data).toHaveLength(0);
	});
});
