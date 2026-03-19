import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { PostgresErrorCodes } from '../../../src/integrations/supabase/errorcodes';
import { createClientAnon } from '../../db';
import type { LessonTypeInsert } from '../../types';
import { unwrapError } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

describe('RLS: anonymous user – lesson_types', () => {
	it('anon cannot read lesson_types', async () => {
		const db = createClientAnon();
		const error = unwrapError(await db.from('lesson_types').select('*'));
		expect(error.code).toBe(PostgresErrorCodes.INSUFFICIENT_PRIVILEGE);
	});

	it('anon cannot insert lesson_types', async () => {
		const db = createClientAnon();
		const newLessonType: LessonTypeInsert = {
			name: 'Hacked Lesson Type',
			icon: 'test',
			color: '#FF0000',
		};
		unwrapError(await db.from('lesson_types').insert(newLessonType).select());
	});

	it('anon cannot update lesson_types', async () => {
		const db = createClientAnon();
		const error = unwrapError(
			await db.from('lesson_types').update({ name: 'Hacked' }).neq('name', 'Hacked').select(),
		);
		expect(error.code).toBe(PostgresErrorCodes.INSUFFICIENT_PRIVILEGE);
	});

	it('anon cannot delete lesson_types', async () => {
		const db = createClientAnon();
		const error = unwrapError(
			await db.from('lesson_types').delete().neq('id', '00000000-0000-0000-0000-000000000000').select(),
		);
		expect(error.code).toBe(PostgresErrorCodes.INSUFFICIENT_PRIVILEGE);
	});
});
