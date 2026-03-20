import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs, createClientBypassRLS } from '../../db';
import { unwrap } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
import { LESSON_TYPE_OPTIONS } from '../seed-data-constants';
import { TestUsers } from '../test-users';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

describe('RLS: lesson_type_options SELECT', () => {
	it('authenticated student can read full Gitaarles option grid (matches seed)', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const dbNoRLS = createClientBypassRLS();
		const lessonTypeId = fixtures.requireLessonTypeId('Gitaarles');

		const expectedIds = unwrap(
			await dbNoRLS.from('lesson_type_options').select('id').eq('lesson_type_id', lessonTypeId),
		);
		expect(expectedIds).toHaveLength(LESSON_TYPE_OPTIONS.FULL_GRID_ROW_COUNT);

		const data = unwrap(await db.from('lesson_type_options').select('id').eq('lesson_type_id', lessonTypeId));
		expect(data.map((r) => r.id).sort()).toEqual(expectedIds.map((r) => r.id).sort());
	});
});
