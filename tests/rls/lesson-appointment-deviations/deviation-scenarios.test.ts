/**
 * Scenario tests for deviation behaviour: change (single/recurring),
 * restore in same week vs later week, and "only this" in first week.
 * Verifies the DB state after the operations the UI would perform.
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { PostgresErrorCodes } from '../../../src/integrations/supabase/errorcodes';
import { createClientBypassRLS } from '../../db';
import { expectNonNull, unwrapError } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
import { callRpc } from '../rpc';
import { TestUsers } from '../test-users';
import {
	buildDeviationData,
	cleanupDeviation,
	dateDaysFromNow,
	deleteDeviation,
	getActualDateInOriginalWeek,
	getDateForDayOfWeek,
	getDeviation,
	getTestAgreementAlice,
	insertDeviation,
	insertDeviationWithCleanup,
	originalDateForWeek,
	verifyDeleted,
} from './utils';

const dbNoRLS = createClientBypassRLS();
const agreement = getTestAgreementAlice();

describe('deviation scenarios: change single and recurring', () => {
	let initialState: DatabaseState;
	const { setupState, verifyState } = setupDatabaseStateVerification();
	const createdIds: string[] = [];

	beforeAll(async () => {
		initialState = await setupState();
	});

	afterAll(async () => {
		for (const id of createdIds) {
			await cleanupDeviation(id);
		}
		await verifyState(initialState);
	});

	it('change single: insert single deviation for one week', async () => {
		const { insertRow, originalDate } = buildDeviationData({
			agreementId: agreement.id,
			dayOfWeek: agreement.day_of_week,
			startTime: agreement.start_time,
			refDays: 14,
			actualStartTime: '15:00',
			recurring: false,
		});

		const data = await insertDeviation(TestUsers.TEACHER_ALICE, insertRow);

		expect(data.recurring).toBe(false);
		expect(data.original_date).toBe(originalDate);
		createdIds.push(data.id);
	});

	it('change recurring: insert recurring deviation', async () => {
		const { insertRow } = buildDeviationData({
			agreementId: agreement.id,
			dayOfWeek: agreement.day_of_week,
			startTime: agreement.start_time,
			refDays: 21,
			actualStartTime: '16:00',
			recurring: true,
		});

		const data = await insertDeviation(TestUsers.TEACHER_ALICE, insertRow);

		expect(data.recurring).toBe(true);
		createdIds.push(data.id);
	});
});

describe('deviation scenarios: unique index (lesson_agreement_id, original_date)', () => {
	let initialState: DatabaseState;
	const { setupState, verifyState } = setupDatabaseStateVerification();
	const createdIds: string[] = [];
	const weekRefDays = 28;

	beforeAll(async () => {
		initialState = await setupState();
	});

	afterAll(async () => {
		for (const id of createdIds) {
			await cleanupDeviation(id);
		}
		await verifyState(initialState);
	});

	it('second INSERT with same (lesson_agreement_id, original_date) fails with unique violation', async () => {
		const { insertRow } = buildDeviationData({
			agreementId: agreement.id,
			dayOfWeek: agreement.day_of_week,
			startTime: agreement.start_time,
			refDays: weekRefDays,
			actualStartTime: '14:00',
			recurring: false,
		});

		const firstData = await insertDeviation(TestUsers.TEACHER_ALICE, insertRow);
		createdIds.push(firstData.id);

		const { insertRow: secondInsertRow } = buildDeviationData({
			agreementId: agreement.id,
			dayOfWeek: agreement.day_of_week,
			startTime: agreement.start_time,
			refDays: weekRefDays,
			offsetDays: 4,
			actualStartTime: '15:00',
			recurring: false,
		});

		const error = unwrapError(
			await dbNoRLS.from('lesson_appointment_deviations').insert(secondInsertRow).select().single(),
		);
		expect(error.code).toBe(PostgresErrorCodes.UNIQUE_VIOLATION);
	});
});

describe('deviation scenarios: restore single deviation to original in same week', () => {
	let initialState: DatabaseState;
	const { setupState, verifyState } = setupDatabaseStateVerification();
	const createdIds: string[] = [];

	beforeAll(async () => {
		initialState = await setupState();
	});

	afterAll(async () => {
		for (const id of createdIds) {
			await cleanupDeviation(id);
		}
		await verifyState(initialState);
	});

	it('restore single deviation in same week: DELETE row', async () => {
		const { insertRow } = buildDeviationData({
			agreementId: agreement.id,
			dayOfWeek: agreement.day_of_week,
			startTime: agreement.start_time,
			refDays: 35,
			actualStartTime: '14:00',
			recurring: false,
		});

		const data = await insertDeviation(TestUsers.TEACHER_ALICE, insertRow);
		createdIds.push(data.id);

		const deleted = await verifyDeleted(data.id);
		expect(deleted).toBe(false);

		// Delete via RLS
		await deleteDeviation(TestUsers.TEACHER_ALICE, data.id);

		const isDeleted = await verifyDeleted(data.id);
		expect(isDeleted).toBe(true);
	});
});

describe('deviation scenarios: restore recurring deviation to original in same week', () => {
	let initialState: DatabaseState;
	const { setupState, verifyState } = setupDatabaseStateVerification();
	let deviationId: string | null = null;

	beforeAll(async () => {
		initialState = await setupState();
		const { insertRow } = buildDeviationData({
			agreementId: agreement.id,
			dayOfWeek: agreement.day_of_week,
			startTime: agreement.start_time,
			refDays: 42,
			actualStartTime: '14:00',
			recurring: true,
		});
		const data = await insertDeviation(TestUsers.TEACHER_ALICE, insertRow);
		deviationId = data.id;
	});

	afterAll(async () => {
		if (deviationId) {
			await cleanupDeviation(deviationId);
		}
		await verifyState(initialState);
	});

	it('restore recurring deviation in same week (this and future): DELETE row', async () => {
		expectNonNull(deviationId);

		await deleteDeviation(TestUsers.TEACHER_ALICE, deviationId);

		const isDeleted = await verifyDeleted(deviationId);
		expect(isDeleted).toBe(true);
	});
});

describe('deviation scenarios: restore to original in a later week (recurring_end_date)', () => {
	let initialState: DatabaseState;
	const { setupState, verifyState } = setupDatabaseStateVerification();
	let recurringDeviationId: string | null = null;

	beforeAll(async () => {
		initialState = await setupState();
		const { insertRow } = buildDeviationData({
			agreementId: agreement.id,
			dayOfWeek: agreement.day_of_week,
			startTime: agreement.start_time,
			refDays: 49,
			actualStartTime: '14:00',
			recurring: true,
		});

		const data = await insertDeviation(TestUsers.TEACHER_ALICE, insertRow);
		recurringDeviationId = data.id;
	});

	afterAll(async () => {
		if (recurringDeviationId) {
			await cleanupDeviation(recurringDeviationId);
		}
		await verifyState(initialState);
	});

	it('restore recurring in later week: recurring_end_date set (last week deviation applies)', async () => {
		expectNonNull(recurringDeviationId);

		const userId = fixtures.requireUserId(TestUsers.TEACHER_ALICE);
		const weekWhereUserDropped = originalDateForWeek(agreement.day_of_week, dateDaysFromNow(56));
		const expectedEndDate = new Date(weekWhereUserDropped + 'T12:00:00');
		expectedEndDate.setDate(expectedEndDate.getDate() - 7);
		const recurringEndDateStr = expectedEndDate.toISOString().split('T')[0];

		const result = await callRpc(TestUsers.TEACHER_ALICE, 'end_recurring_deviation_from_week', {
			p_deviation_id: recurringDeviationId,
			p_week_date: weekWhereUserDropped,
			p_user_id: userId,
		});

		expect(result).toBe('updated');
		const row = await getDeviation(recurringDeviationId);
		expect(row.recurring_end_date).toBe(recurringEndDateStr);
	});
});

describe('deviation scenarios: end_recurring_deviation_from_week RPC', () => {
	let initialState: DatabaseState;
	const { setupState, verifyState } = setupDatabaseStateVerification();
	let recurringDeviationId: string | null = null;
	const weekRefDays = 63;

	beforeAll(async () => {
		initialState = await setupState();
		const { insertRow } = buildDeviationData({
			agreementId: agreement.id,
			dayOfWeek: agreement.day_of_week,
			startTime: agreement.start_time,
			refDays: weekRefDays,
			actualStartTime: '14:00',
			recurring: true,
		});

		const data = await insertDeviation(TestUsers.TEACHER_ALICE, insertRow);
		recurringDeviationId = data.id;
	});

	afterAll(async () => {
		if (recurringDeviationId) {
			await cleanupDeviation(recurringDeviationId);
		}
		await verifyState(initialState);
	});

	it('first week: returns deleted and removes row', async () => {
		expectNonNull(recurringDeviationId);

		const userId = fixtures.requireUserId(TestUsers.TEACHER_ALICE);
		const week1Monday = originalDateForWeek(agreement.day_of_week, dateDaysFromNow(weekRefDays));

		const result = await callRpc(TestUsers.TEACHER_ALICE, 'end_recurring_deviation_from_week', {
			p_deviation_id: recurringDeviationId,
			p_week_date: week1Monday,
			p_user_id: userId,
		});

		expect(result).toBe('deleted');
		const isDeleted = await verifyDeleted(recurringDeviationId);
		expect(isDeleted).toBe(true);
	});
});

describe('deviation scenarios: override recurring deviation with actual=original', () => {
	let initialState: DatabaseState;
	const { setupState, verifyState } = setupDatabaseStateVerification();
	let recurringDeviationId: string | null = null;
	let overrideDeviationId: string | null = null;

	beforeAll(async () => {
		initialState = await setupState();
		const { insertRow } = buildDeviationData({
			agreementId: agreement.id,
			dayOfWeek: agreement.day_of_week,
			startTime: agreement.start_time,
			refDays: 70,
			actualStartTime: '14:00',
			recurring: true,
		});

		const data = await insertDeviation(TestUsers.TEACHER_ALICE, insertRow);
		recurringDeviationId = data.id;
	});

	afterAll(async () => {
		if (overrideDeviationId) await cleanupDeviation(overrideDeviationId);
		if (recurringDeviationId) await cleanupDeviation(recurringDeviationId);
		await verifyState(initialState);
	});

	it('insert deviation with actual=original is allowed when overriding a recurring deviation', async () => {
		if (!recurringDeviationId) throw new Error('Recurring deviation not created');
		const userId = fixtures.requireUserId(TestUsers.TEACHER_ALICE);
		const week3Monday = originalDateForWeek(agreement.day_of_week, dateDaysFromNow(77));

		const data = await insertDeviation(TestUsers.TEACHER_ALICE, {
			lesson_agreement_id: agreement.id,
			original_date: week3Monday,
			original_start_time: agreement.start_time,
			actual_date: week3Monday,
			actual_start_time: agreement.start_time,
			recurring: false,
			created_by_user_id: userId,
			last_updated_by_user_id: userId,
		});

		expect(data.actual_date).toBe(week3Monday);
		expect(data.actual_start_time).toBe(agreement.start_time);
		overrideDeviationId = data.id;
	});

	it('restore single deviation (that overrode recurring) back to original: week shows Monday green', async () => {
		const userId = fixtures.requireUserId(TestUsers.TEACHER_ALICE);
		const week1Monday = originalDateForWeek(agreement.day_of_week, dateDaysFromNow(84));
		const week2Monday = originalDateForWeek(agreement.day_of_week, dateDaysFromNow(91));
		const dropped2 = new Date(week2Monday + 'T14:00:00');
		dropped2.setDate(dropped2.getDate() + 2);
		const week2Wednesday = getActualDateInOriginalWeek(week2Monday, dropped2);

		// Create recurring Mon→Tue for week 1
		const dropped1 = new Date(week1Monday + 'T14:00:00');
		dropped1.setDate(dropped1.getDate() + 1);
		const recurData = await insertDeviation(TestUsers.TEACHER_ALICE, {
			lesson_agreement_id: agreement.id,
			original_date: week1Monday,
			original_start_time: agreement.start_time,
			actual_date: getActualDateInOriginalWeek(week1Monday, dropped1),
			actual_start_time: '14:00',
			recurring: true,
			created_by_user_id: userId,
			last_updated_by_user_id: userId,
		});
		const recurringId = recurData.id;

		// Create single for week 2: move that week to Wednesday
		await insertDeviation(TestUsers.TEACHER_ALICE, {
			lesson_agreement_id: agreement.id,
			original_date: week2Monday,
			original_start_time: agreement.start_time,
			actual_date: week2Wednesday,
			actual_start_time: '14:00',
			recurring: false,
			created_by_user_id: userId,
			last_updated_by_user_id: userId,
		});

		// Restore to original via RPC
		const result = await callRpc(TestUsers.TEACHER_ALICE, 'ensure_week_shows_original_slot', {
			p_lesson_agreement_id: agreement.id,
			p_week_date: week2Monday,
			p_user_id: userId,
			p_scope: 'only_this',
		});

		expect(result).toBe('single_replaced_with_override');

		const { data: overrideRows } = await dbNoRLS
			.from('lesson_appointment_deviations')
			.select('id, original_date, actual_date')
			.eq('lesson_agreement_id', agreement.id)
			.eq('original_date', week2Monday)
			.eq('recurring', false);
		expect((overrideRows ?? []).length).toBe(1);
		expect((overrideRows ?? [])[0]).toMatchObject({ original_date: week2Monday, actual_date: week2Monday });

		const { data: recurringRow } = await dbNoRLS
			.from('lesson_appointment_deviations')
			.select('id')
			.eq('id', recurringId)
			.maybeSingle();
		expect(recurringRow).not.toBeNull();

		// Cleanup
		const overrideId = (overrideRows ?? [])[0]?.id;
		if (overrideId) await cleanupDeviation(overrideId);
		await cleanupDeviation(recurringId);
	});

	it('insert deviation with actual=original is rejected when there is no recurring deviation to override', async () => {
		const userId = fixtures.requireUserId(TestUsers.TEACHER_ALICE);
		const weekBeforeRecurring = originalDateForWeek(agreement.day_of_week, dateDaysFromNow(63));

		const db = await import('../../db').then((m) => m.createClientAs(TestUsers.TEACHER_ALICE));
		const { data, error } = await db
			.from('lesson_appointment_deviations')
			.insert({
				lesson_agreement_id: agreement.id,
				original_date: weekBeforeRecurring,
				original_start_time: agreement.start_time,
				actual_date: weekBeforeRecurring,
				actual_start_time: agreement.start_time,
				recurring: false,
				created_by_user_id: userId,
				last_updated_by_user_id: userId,
			})
			.select()
			.single();

		expect(error).not.toBeNull();
		expect(error?.message).toContain('Deviation must actually deviate');
		expect(data).toBeNull();
	});
});

describe('deviation scenarios: shift_recurring_deviation_to_next_week function', () => {
	let initialState: DatabaseState;
	const { setupState, verifyState } = setupDatabaseStateVerification();
	let recurringDeviationId: string | null = null;
	const weekRefDays = 105;
	let minOriginalDate: string;

	beforeAll(async () => {
		initialState = await setupState();
		const { insertRow, originalDate } = buildDeviationData({
			agreementId: agreement.id,
			dayOfWeek: agreement.day_of_week,
			startTime: agreement.start_time,
			refDays: weekRefDays,
			actualStartTime: '14:00',
			recurring: true,
		});
		minOriginalDate = originalDate;

		const data = await insertDeviation(TestUsers.TEACHER_ALICE, insertRow);
		recurringDeviationId = data.id;
	});

	afterAll(async () => {
		const { data: rows } = await dbNoRLS
			.from('lesson_appointment_deviations')
			.select('id')
			.eq('lesson_agreement_id', agreement.id)
			.gte('original_date', minOriginalDate);
		for (const row of rows ?? []) {
			await cleanupDeviation((row as { id: string }).id);
		}
		await verifyState(initialState);
	});

	it('shift_recurring_deviation_to_next_week atomically moves deviation to next week', async () => {
		if (!recurringDeviationId) throw new Error('Recurring deviation not created');
		const userId = fixtures.requireUserId(TestUsers.TEACHER_ALICE);
		const nextWeekMonday = originalDateForWeek(agreement.day_of_week, dateDaysFromNow(weekRefDays + 7));

		const newId = await callRpc(TestUsers.TEACHER_ALICE, 'shift_recurring_deviation_to_next_week', {
			p_deviation_id: recurringDeviationId,
			p_user_id: userId,
		});

		expect(newId).not.toBeNull();

		const isOldDeleted = await verifyDeleted(recurringDeviationId);
		expect(isOldDeleted).toBe(true);

		const newRow = await getDeviation(newId as string);
		expect(newRow).not.toBeNull();
		expect(newRow?.original_date).toBe(nextWeekMonday);
		expect(newRow?.recurring).toBe(true);
	});
});

describe('deviation scenarios: restore only this occurrence in first week', () => {
	let initialState: DatabaseState;
	const { setupState, verifyState } = setupDatabaseStateVerification();
	let recurringDeviationId: string | null = null;
	const weekRefDays = 119;
	let minOriginalDate: string;

	beforeAll(async () => {
		initialState = await setupState();
		const { insertRow, originalDate } = buildDeviationData({
			agreementId: agreement.id,
			dayOfWeek: agreement.day_of_week,
			startTime: agreement.start_time,
			refDays: weekRefDays,
			actualStartTime: '14:00',
			recurring: true,
		});
		minOriginalDate = originalDate;

		const data = await insertDeviation(TestUsers.TEACHER_ALICE, insertRow);
		recurringDeviationId = data.id;
	});

	afterAll(async () => {
		const { data: rows } = await dbNoRLS
			.from('lesson_appointment_deviations')
			.select('id')
			.eq('lesson_agreement_id', agreement.id)
			.gte('original_date', minOriginalDate);
		for (const row of rows ?? []) {
			await cleanupDeviation((row as { id: string }).id);
		}
		await verifyState(initialState);
	});

	it('only this in first week: old recurring removed, new recurring starts next week (original_date + 7)', async () => {
		if (!recurringDeviationId) throw new Error('Recurring deviation not created');
		const userId = fixtures.requireUserId(TestUsers.TEACHER_ALICE);
		const existing = await getDeviation(recurringDeviationId);
		const actualDayOfWeek = existing?.actual_date ? new Date(existing.actual_date + 'T12:00:00').getDay() : 4;
		const thisWeekOriginal = originalDateForWeek(agreement.day_of_week, dateDaysFromNow(weekRefDays));
		const nextWeekDate = new Date(thisWeekOriginal + 'T12:00:00');
		nextWeekDate.setDate(nextWeekDate.getDate() + 7);
		const nextWeekOriginalStr = nextWeekDate.toISOString().split('T')[0];
		const nextWeekActualDate = getDateForDayOfWeek(actualDayOfWeek, nextWeekDate);
		const nextWeekActualStr = nextWeekActualDate.toISOString().split('T')[0];

		await deleteDeviation(TestUsers.TEACHER_ALICE, recurringDeviationId);

		const inserted = await insertDeviation(TestUsers.TEACHER_ALICE, {
			lesson_agreement_id: agreement.id,
			original_date: nextWeekOriginalStr,
			original_start_time: agreement.start_time,
			actual_date: nextWeekActualStr,
			actual_start_time: '14:00',
			recurring: true,
			created_by_user_id: userId,
			last_updated_by_user_id: userId,
		});

		expect(inserted.original_date).toBe(nextWeekOriginalStr);
		expect(inserted.recurring).toBe(true);

		const { data: allForAgreement } = await dbNoRLS
			.from('lesson_appointment_deviations')
			.select('id, original_date, recurring')
			.eq('lesson_agreement_id', agreement.id)
			.gte('original_date', minOriginalDate);
		const recurringRows = (allForAgreement ?? []).filter((r: { recurring: boolean }) => r.recurring);
		expect(recurringRows.length).toBe(1);
		expect((recurringRows[0] as { original_date: string }).original_date).toBe(nextWeekOriginalStr);
	});
});

describe('deviation scenarios: ensure_week_shows_original_slot RPC', () => {
	let initialState: DatabaseState;
	const { setupState, verifyState } = setupDatabaseStateVerification();
	const createdIds: string[] = [];

	beforeAll(async () => {
		initialState = await setupState();
	});

	afterAll(async () => {
		for (const id of createdIds) {
			await cleanupDeviation(id);
		}
		await verifyState(initialState);
	});

	it('recurring first week + this_and_future → recurring_deleted', async () => {
		const userId = fixtures.requireUserId(TestUsers.TEACHER_ALICE);
		const { insertRow, originalDate } = buildDeviationData({
			agreementId: agreement.id,
			dayOfWeek: agreement.day_of_week,
			startTime: agreement.start_time,
			refDays: 126,
			actualStartTime: '14:00',
			recurring: true,
		});

		const { data } = await insertDeviationWithCleanup(TestUsers.TEACHER_ALICE, insertRow);
		createdIds.push(data.id);

		const result = await callRpc(TestUsers.TEACHER_ALICE, 'ensure_week_shows_original_slot', {
			p_lesson_agreement_id: agreement.id,
			p_week_date: originalDate,
			p_user_id: userId,
			p_scope: 'this_and_future',
		});

		expect(result).toBe('recurring_deleted');
		const isDeleted = await verifyDeleted(data.id);
		expect(isDeleted).toBe(true);
	});

	it('recurring first week + only_this → recurring_shifted', async () => {
		const userId = fixtures.requireUserId(TestUsers.TEACHER_ALICE);
		const { insertRow, originalDate } = buildDeviationData({
			agreementId: agreement.id,
			dayOfWeek: agreement.day_of_week,
			startTime: agreement.start_time,
			refDays: 133,
			actualStartTime: '14:00',
			recurring: true,
		});

		const { data } = await insertDeviationWithCleanup(TestUsers.TEACHER_ALICE, insertRow);
		createdIds.push(data.id);

		const result = await callRpc(TestUsers.TEACHER_ALICE, 'ensure_week_shows_original_slot', {
			p_lesson_agreement_id: agreement.id,
			p_week_date: originalDate,
			p_user_id: userId,
			p_scope: 'only_this',
		});

		expect(result).toBe('recurring_shifted');
		const isOldDeleted = await verifyDeleted(data.id);
		expect(isOldDeleted).toBe(true);
		const nextWeekMonday = originalDateForWeek(agreement.day_of_week, dateDaysFromNow(140));
		const { data: newRows } = await dbNoRLS
			.from('lesson_appointment_deviations')
			.select('id')
			.eq('lesson_agreement_id', agreement.id)
			.eq('original_date', nextWeekMonday)
			.eq('recurring', true);
		expect((newRows ?? []).length).toBe(1);
		if ((newRows ?? [])[0]?.id) createdIds.push((newRows as { id: string }[])[0].id);
	});

	it('recurring later week + this_and_future → recurring_ended', async () => {
		const userId = fixtures.requireUserId(TestUsers.TEACHER_ALICE);
		const { insertRow, originalDate: week1Monday } = buildDeviationData({
			agreementId: agreement.id,
			dayOfWeek: agreement.day_of_week,
			startTime: agreement.start_time,
			refDays: 147,
			actualStartTime: '14:00',
			recurring: true,
		});
		const week2Monday = originalDateForWeek(agreement.day_of_week, dateDaysFromNow(154));

		const { data } = await insertDeviationWithCleanup(TestUsers.TEACHER_ALICE, insertRow);
		createdIds.push(data.id);

		const result = await callRpc(TestUsers.TEACHER_ALICE, 'ensure_week_shows_original_slot', {
			p_lesson_agreement_id: agreement.id,
			p_week_date: week2Monday,
			p_user_id: userId,
			p_scope: 'this_and_future',
		});

		expect(result).toBe('recurring_ended');
		const row = await getDeviation(data.id);
		expect((row as { recurring_end_date: string } | null)?.recurring_end_date).toBe(week1Monday);
	});

	it('single that overrode recurring + restore → single_replaced_with_override and week shows original', async () => {
		const userId = fixtures.requireUserId(TestUsers.TEACHER_ALICE);
		const week1Monday = originalDateForWeek(agreement.day_of_week, dateDaysFromNow(168));
		const week2Monday = originalDateForWeek(agreement.day_of_week, dateDaysFromNow(175));
		const dropped2 = new Date(week2Monday + 'T14:00:00');
		dropped2.setDate(dropped2.getDate() + 2);
		const week2Wed = getActualDateInOriginalWeek(week2Monday, dropped2);

		const dropped1 = new Date(week1Monday + 'T14:00:00');
		dropped1.setDate(dropped1.getDate() + 1);
		const recurData = await insertDeviation(TestUsers.TEACHER_ALICE, {
			lesson_agreement_id: agreement.id,
			original_date: week1Monday,
			original_start_time: agreement.start_time,
			actual_date: getActualDateInOriginalWeek(week1Monday, dropped1),
			actual_start_time: '14:00',
			recurring: true,
			created_by_user_id: userId,
			last_updated_by_user_id: userId,
		});
		createdIds.push(recurData.id);

		const singleData = await insertDeviation(TestUsers.TEACHER_ALICE, {
			lesson_agreement_id: agreement.id,
			original_date: week2Monday,
			original_start_time: agreement.start_time,
			actual_date: week2Wed,
			actual_start_time: '14:00',
			recurring: false,
			created_by_user_id: userId,
			last_updated_by_user_id: userId,
		});
		createdIds.push(singleData.id);

		const result = await callRpc(TestUsers.TEACHER_ALICE, 'ensure_week_shows_original_slot', {
			p_lesson_agreement_id: agreement.id,
			p_week_date: week2Monday,
			p_user_id: userId,
			p_scope: 'only_this',
		});

		expect(result).toBe('single_replaced_with_override');
		const isSingleDeleted = await verifyDeleted(singleData.id);
		expect(isSingleDeleted).toBe(true);
		const { data: overrideRows } = await dbNoRLS
			.from('lesson_appointment_deviations')
			.select('id, original_date, actual_date, actual_start_time')
			.eq('lesson_agreement_id', agreement.id)
			.eq('original_date', week2Monday)
			.eq('recurring', false);
		expect((overrideRows ?? []).length).toBe(1);
		const override = (overrideRows ?? [])[0] as {
			id: string;
			original_date: string;
			actual_date: string;
			actual_start_time: string;
		};
		expect(override.original_date).toBe(week2Monday);
		expect(override.actual_date).toBe(week2Monday);
		expect(override.actual_start_time).toBe(agreement.start_time);
		if (override.id) createdIds.push(override.id);
	});

	it('later occurrence of recurring + only_this → override_inserted', async () => {
		const userId = fixtures.requireUserId(TestUsers.TEACHER_ALICE);
		const { insertRow } = buildDeviationData({
			agreementId: agreement.id,
			dayOfWeek: agreement.day_of_week,
			startTime: agreement.start_time,
			refDays: 182,
			actualStartTime: '14:00',
			recurring: true,
		});
		const week2Monday = originalDateForWeek(agreement.day_of_week, dateDaysFromNow(189));

		const { data } = await insertDeviationWithCleanup(TestUsers.TEACHER_ALICE, insertRow);
		createdIds.push(data.id);

		const result = await callRpc(TestUsers.TEACHER_ALICE, 'ensure_week_shows_original_slot', {
			p_lesson_agreement_id: agreement.id,
			p_week_date: week2Monday,
			p_user_id: userId,
			p_scope: 'only_this',
		});

		expect(result).toBe('override_inserted');
		const { data: overrideRows } = await dbNoRLS
			.from('lesson_appointment_deviations')
			.select('id, original_date, actual_date, recurring')
			.eq('lesson_agreement_id', agreement.id)
			.eq('original_date', week2Monday)
			.eq('recurring', false);
		expect((overrideRows ?? []).length).toBe(1);
		const override = (overrideRows ?? [])[0] as { id: string; actual_date: string };
		expect(override.actual_date).toBe(week2Monday);
		if (override.id) createdIds.push(override.id);
	});
});

describe('deviation scenarios: single (no recurring) restore behavior', () => {
	let initialState: DatabaseState;
	const { setupState, verifyState } = setupDatabaseStateVerification();
	let singleDeviationId: string | null = null;

	beforeAll(async () => {
		initialState = await setupState();
	});

	afterAll(async () => {
		if (singleDeviationId) {
			await cleanupDeviation(singleDeviationId);
		}
		await verifyState(initialState);
	});

	it('single (no recurring) + restore → single_deleted', async () => {
		const { insertRow, originalDate } = buildDeviationData({
			agreementId: agreement.id,
			dayOfWeek: agreement.day_of_week,
			startTime: agreement.start_time,
			refDays: 300,
			actualStartTime: '14:00',
			recurring: false,
		});

		const data = await insertDeviation(TestUsers.TEACHER_ALICE, insertRow);
		singleDeviationId = data.id;

		const userId = fixtures.requireUserId(TestUsers.TEACHER_ALICE);
		const result = await callRpc(TestUsers.TEACHER_ALICE, 'ensure_week_shows_original_slot', {
			p_lesson_agreement_id: agreement.id,
			p_week_date: originalDate,
			p_user_id: userId,
			p_scope: 'only_this',
		});

		expect(result).toBe('single_deleted');
		const isDeleted = await verifyDeleted(singleDeviationId);
		expect(isDeleted).toBe(true);
	});
});
