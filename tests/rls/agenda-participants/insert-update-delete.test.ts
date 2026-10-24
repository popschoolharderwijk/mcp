/**
 * RLS and trigger tests for agenda_participants.
 *
 * Tests cover:
 * - Owner cannot be removed as participant (trigger)
 * - Only event owner or privileged users can insert / update / delete participants
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { formatDateToDb, now } from '../../../src/lib/date/date-format';
import { createClientAs, createClientBypassRLS } from '../../db';
import type { AgendaEventInsert } from '../../types';
import { unwrap, unwrapError } from '../../utils';
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

const dbNoRLS = createClientBypassRLS();

const staffUserId = fixtures.requireUserId(TestUsers.STAFF_ONE);
const student001UserId = fixtures.requireUserId(TestUsers.STUDENT_001);
const student002UserId = fixtures.requireUserId(TestUsers.STUDENT_002);
const teacherAliceUserId = fixtures.requireUserId(TestUsers.TEACHER_ALICE);
const teacherBobUserId = fixtures.requireUserId(TestUsers.TEACHER_BOB);

function createManualEvent(ownerUserId: string, title: string): AgendaEventInsert {
	const today = formatDateToDb(now());
	return {
		source_type: 'manual',
		owner_user_id: ownerUserId,
		title,
		start_date: today,
		start_time: '10:00:00',
		end_date: today,
		end_time: '11:00:00',
		is_all_day: false,
		recurring: false,
	};
}

describe('agenda_participants owner protection', () => {
	it('trigger prevents removing owner from participants', async () => {
		const staffDb = await createClientAs(TestUsers.STAFF_ONE);

		// Create a manual agenda event with staff as owner
		const [event] = unwrap(
			await staffDb
				.from('agenda_events')
				.insert(createManualEvent(staffUserId, 'Test event for owner removal'))
				.select('id'),
		);

		// Add owner as participant
		unwrap(
			await staffDb.from('agenda_participants').insert({
				event_id: event.id,
				user_id: staffUserId,
			}),
		);

		// Add another participant
		unwrap(
			await staffDb.from('agenda_participants').insert({
				event_id: event.id,
				user_id: student001UserId,
			}),
		);

		// Try to remove owner from participants - should fail
		const deleteOwnerResult = await staffDb
			.from('agenda_participants')
			.delete()
			.eq('event_id', event.id)
			.eq('user_id', staffUserId);

		const error = unwrapError(deleteOwnerResult);
		expect(error.message).toContain('Cannot remove event owner from participants');

		// Removing non-owner participant should succeed
		unwrap(
			await staffDb.from('agenda_participants').delete().eq('event_id', event.id).eq('user_id', student001UserId),
		);

		// Cleanup: remove owner participant (bypass RLS) and event
		unwrap(await dbNoRLS.from('agenda_events').delete().eq('id', event.id).select('id'));
	});

	it('non-owner cannot delete participants from event they do not own', async () => {
		const staffDb = await createClientAs(TestUsers.STAFF_ONE);
		const studentDb = await createClientAs(TestUsers.STUDENT_001);

		// Create a manual agenda event with staff as owner
		const [event] = unwrap(
			await staffDb
				.from('agenda_events')
				.insert(createManualEvent(staffUserId, 'Test event for participant deletion'))
				.select('id'),
		);

		// Add participants
		unwrap(
			await staffDb.from('agenda_participants').insert({
				event_id: event.id,
				user_id: staffUserId,
			}),
		);
		unwrap(
			await staffDb.from('agenda_participants').insert({
				event_id: event.id,
				user_id: student001UserId,
			}),
		);
		unwrap(
			await staffDb.from('agenda_participants').insert({
				event_id: event.id,
				user_id: student002UserId,
			}),
		);

		expect(
			unwrap(
				await studentDb
					.from('agenda_participants')
					.delete()
					.eq('event_id', event.id)
					.eq('user_id', student002UserId)
					.select('user_id'),
			),
		).toHaveLength(0);

		expect(
			unwrap(
				await dbNoRLS
					.from('agenda_participants')
					.select('user_id')
					.eq('event_id', event.id)
					.eq('user_id', student002UserId),
			),
		).toEqual([{ user_id: student002UserId }]);

		unwrap(await dbNoRLS.from('agenda_events').delete().eq('id', event.id).select('id'));
	});

	it('owner can add and remove non-owner participants', async () => {
		const staffDb = await createClientAs(TestUsers.STAFF_ONE);

		// Create a manual agenda event
		const [event] = unwrap(
			await staffDb
				.from('agenda_events')
				.insert(createManualEvent(staffUserId, 'Test event for participant management'))
				.select('id'),
		);

		// Add owner as participant
		unwrap(
			await staffDb.from('agenda_participants').insert({
				event_id: event.id,
				user_id: staffUserId,
			}),
		);

		// Add another participant
		unwrap(
			await staffDb.from('agenda_participants').insert({
				event_id: event.id,
				user_id: student001UserId,
			}),
		);

		expect(
			unwrap(await staffDb.from('agenda_participants').select('user_id').eq('event_id', event.id)),
		).toHaveLength(2);

		unwrap(
			await staffDb.from('agenda_participants').delete().eq('event_id', event.id).eq('user_id', student001UserId),
		);

		expect(unwrap(await staffDb.from('agenda_participants').select('user_id').eq('event_id', event.id))).toEqual([
			{ user_id: staffUserId },
		]);

		unwrap(await dbNoRLS.from('agenda_events').delete().eq('id', event.id).select('id'));
	});
});

describe('agenda_participants UPDATE', () => {
	it('owner can update a participant user_id on their event', async () => {
		const staffDb = await createClientAs(TestUsers.STAFF_ONE);
		const [event] = unwrap(
			await staffDb
				.from('agenda_events')
				.insert(createManualEvent(staffUserId, 'Test event for participant update'))
				.select('id'),
		);

		unwrap(
			await staffDb.from('agenda_participants').insert([
				{ event_id: event.id, user_id: staffUserId },
				{ event_id: event.id, user_id: student001UserId },
			]),
		);

		const updated = unwrap(
			await staffDb
				.from('agenda_participants')
				.update({ user_id: student002UserId })
				.eq('event_id', event.id)
				.eq('user_id', student001UserId)
				.select('user_id'),
		);
		expect(updated).toEqual([{ user_id: student002UserId }]);

		unwrap(await dbNoRLS.from('agenda_events').delete().eq('id', event.id).select('id'));
	});

	it('non-owner cannot update participants on an event they do not own', async () => {
		const staffDb = await createClientAs(TestUsers.STAFF_ONE);
		const studentDb = await createClientAs(TestUsers.STUDENT_001);
		const [event] = unwrap(
			await staffDb
				.from('agenda_events')
				.insert(createManualEvent(staffUserId, 'Test event for blocked participant update'))
				.select('id'),
		);

		unwrap(
			await staffDb.from('agenda_participants').insert([
				{ event_id: event.id, user_id: staffUserId },
				{ event_id: event.id, user_id: student001UserId },
			]),
		);

		expect(
			unwrap(
				await studentDb
					.from('agenda_participants')
					.update({ user_id: student002UserId })
					.eq('event_id', event.id)
					.eq('user_id', student001UserId)
					.select('user_id'),
			),
		).toHaveLength(0);

		expect(
			unwrap(
				await dbNoRLS
					.from('agenda_participants')
					.select('user_id')
					.eq('event_id', event.id)
					.eq('user_id', student001UserId),
			),
		).toEqual([{ user_id: student001UserId }]);

		unwrap(await dbNoRLS.from('agenda_events').delete().eq('id', event.id).select('id'));
	});
});

describe('agenda_participants teacher restriction', () => {
	it('student cannot add teacher as participant to their event', async () => {
		const studentDb = await createClientAs(TestUsers.STUDENT_001);
		// Student creates their own event
		const [event] = unwrap(
			await studentDb
				.from('agenda_events')
				.insert(createManualEvent(student001UserId, 'Student event - cannot add teacher'))
				.select('id'),
		);

		// Student tries to add their teacher as participant - should fail
		const addTeacherResult = await studentDb.from('agenda_participants').insert({
			event_id: event.id,
			user_id: teacherAliceUserId,
		});

		const error = unwrapError(addTeacherResult);
		expect(error.message).toContain('row-level security');

		// Cleanup
		unwrap(await dbNoRLS.from('agenda_events').delete().eq('id', event.id).select('id'));
	});

	it('student can add another student as participant to their event', async () => {
		const studentDb = await createClientAs(TestUsers.STUDENT_001);
		// Student creates their own event
		const [event] = unwrap(
			await studentDb
				.from('agenda_events')
				.insert(createManualEvent(student001UserId, 'Student event - can add student'))
				.select('id'),
		);

		// Student adds themselves as participant
		unwrap(
			await studentDb.from('agenda_participants').insert({
				event_id: event.id,
				user_id: student001UserId,
			}),
		);

		// Student adds another student as participant - should succeed
		unwrap(
			await studentDb.from('agenda_participants').insert({
				event_id: event.id,
				user_id: student002UserId,
			}),
		);

		expect(
			unwrap(await dbNoRLS.from('agenda_participants').select('user_id').eq('event_id', event.id)),
		).toHaveLength(2);

		unwrap(await dbNoRLS.from('agenda_events').delete().eq('id', event.id).select('id'));
	});

	it('teacher can add student as participant to their event', async () => {
		const teacherDb = await createClientAs(TestUsers.TEACHER_ALICE);
		// Teacher creates their own event
		const [event] = unwrap(
			await teacherDb
				.from('agenda_events')
				.insert(createManualEvent(teacherAliceUserId, 'Teacher event - can add student'))
				.select('id'),
		);

		// Teacher adds themselves as participant
		unwrap(
			await teacherDb.from('agenda_participants').insert({
				event_id: event.id,
				user_id: teacherAliceUserId,
			}),
		);

		// Teacher adds a student as participant - should succeed
		unwrap(
			await teacherDb.from('agenda_participants').insert({
				event_id: event.id,
				user_id: student001UserId,
			}),
		);

		expect(
			unwrap(await dbNoRLS.from('agenda_participants').select('user_id').eq('event_id', event.id)),
		).toHaveLength(2);

		unwrap(await dbNoRLS.from('agenda_events').delete().eq('id', event.id).select('id'));
	});

	it('teacher cannot add another teacher as participant to their event', async () => {
		const teacherDb = await createClientAs(TestUsers.TEACHER_ALICE);
		// Teacher creates their own event
		const [event] = unwrap(
			await teacherDb
				.from('agenda_events')
				.insert(createManualEvent(teacherAliceUserId, 'Teacher event - cannot add other teacher'))
				.select('id'),
		);

		// Teacher tries to add another teacher as participant - should fail
		const addTeacherResult = await teacherDb.from('agenda_participants').insert({
			event_id: event.id,
			user_id: teacherBobUserId,
		});

		const error = unwrapError(addTeacherResult);
		expect(error.message).toContain('row-level security');

		// Cleanup
		unwrap(await dbNoRLS.from('agenda_events').delete().eq('id', event.id).select('id'));
	});

	it('privileged user (staff) can add teacher as participant', async () => {
		const staffDb = await createClientAs(TestUsers.STAFF_ONE);
		// Staff creates an event
		const [event] = unwrap(
			await staffDb
				.from('agenda_events')
				.insert(createManualEvent(staffUserId, 'Staff event - can add teacher'))
				.select('id'),
		);

		// Staff adds teacher as participant - should succeed
		unwrap(
			await staffDb.from('agenda_participants').insert({
				event_id: event.id,
				user_id: teacherAliceUserId,
			}),
		);

		expect(unwrap(await dbNoRLS.from('agenda_participants').select('user_id').eq('event_id', event.id))).toEqual([
			{ user_id: teacherAliceUserId },
		]);

		unwrap(await dbNoRLS.from('agenda_events').delete().eq('id', event.id).select('id'));
	});

	it('privileged user (admin) can add teacher as participant', async () => {
		const adminDb = await createClientAs(TestUsers.ADMIN_ONE);
		const adminUserId = fixtures.requireUserId(TestUsers.ADMIN_ONE);
		// Admin creates an event
		const [event] = unwrap(
			await adminDb
				.from('agenda_events')
				.insert(createManualEvent(adminUserId, 'Admin event - can add teacher'))
				.select('id'),
		);

		// Admin adds teacher as participant - should succeed
		unwrap(
			await adminDb.from('agenda_participants').insert({
				event_id: event.id,
				user_id: teacherBobUserId,
			}),
		);

		expect(unwrap(await dbNoRLS.from('agenda_participants').select('user_id').eq('event_id', event.id))).toEqual([
			{ user_id: teacherBobUserId },
		]);

		unwrap(await dbNoRLS.from('agenda_events').delete().eq('id', event.id).select('id'));
	});
});
