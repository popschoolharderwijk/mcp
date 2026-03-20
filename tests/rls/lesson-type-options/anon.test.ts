import { afterAll, beforeAll, describe, it } from 'bun:test';
import { createClientAnon } from '../../db';
import type { LessonTypeOptionInsert } from '../../types';
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

const fakeId = '00000000-0000-0000-0000-000000000001';

/**
 * RLS on lesson_type_options is authenticated-only; anon has no table access.
 */
describe('RLS: anonymous user – lesson_type_options', () => {
	it('anon cannot select lesson_type_options', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(unwrapError(await db.from('lesson_type_options').select('*')));
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

	it('anon cannot update lesson_type_options', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(
				await db.from('lesson_type_options').update({ price_per_lesson: 99 }).eq('id', fakeId).select(),
			),
		);
	});

	it('anon cannot delete lesson_type_options', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(await db.from('lesson_type_options').delete().eq('id', fakeId).select()),
		);
	});
});
