import { afterAll, beforeAll, describe, it } from 'bun:test';
import { createClientAnon } from '../../db';
import { expectInsufficientPrivilege, unwrapError } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { NO_LESSON_PERIODS } from '../seed-data-constants';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

describe('RLS: no_lesson_periods anon', () => {
	it('anon select on no_lesson_periods is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(unwrapError(await db.from('no_lesson_periods').select('id')));
	});

	it('anon insert on no_lesson_periods is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(
				await db
					.from('no_lesson_periods')
					.insert({ name: 'Anon', start_date: '2030-01-01', end_date: '2030-01-02' })
					.select(),
			),
		);
	});

	it('anon update on no_lesson_periods is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(
				await db
					.from('no_lesson_periods')
					.update({ name: 'Anon' })
					.eq('id', NO_LESSON_PERIODS.STUDY_DAYS_ID)
					.select(),
			),
		);
	});

	it('anon delete on no_lesson_periods is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(await db.from('no_lesson_periods').delete().eq('id', NO_LESSON_PERIODS.STUDY_DAYS_ID).select()),
		);
	});
});
