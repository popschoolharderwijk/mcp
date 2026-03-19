import { afterAll, beforeAll, describe, it } from 'bun:test';
import { createClientAnon } from '../../db';
import type { LessonTypeInsert } from '../../types';
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

/**
 * RLS policies for lesson_types are for 'authenticated' only.
 * Anonymous users have no access.
 */
describe('RLS: anonymous user – lesson_types', () => {
	it('anon cannot read lesson_types', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(unwrapError(await db.from('lesson_types').select('*')));
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

	it('anon cannot update lesson_types', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(await db.from('lesson_types').update({ name: 'Hacked' }).neq('name', 'Hacked').select()),
		);
	});

	it('anon cannot delete lesson_types', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(
				await db.from('lesson_types').delete().neq('id', '00000000-0000-0000-0000-000000000000').select(),
			),
		);
	});
});
