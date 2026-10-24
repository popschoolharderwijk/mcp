import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs, createClientBypassRLS } from '../../db';
import type { TeacherAvailabilityInsert } from '../../types';
import { unwrap, unwrapError, unwrapSingleRow } from '../../utils';
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

const aliceTeacherUserId = fixtures.requireTeacherId(TestUsers.TEACHER_ALICE);
const bobTeacherUserId = fixtures.requireTeacherId(TestUsers.TEACHER_BOB);

async function getAliceAvailabilityRow() {
	return unwrapSingleRow(
		await dbNoRLS
			.from('teacher_availability')
			.select('*')
			.eq('teacher_user_id', aliceTeacherUserId)
			.limit(1)
			.single(),
	);
}

async function getBobAvailabilityId() {
	const row = unwrapSingleRow(
		await dbNoRLS
			.from('teacher_availability')
			.select('id')
			.eq('teacher_user_id', bobTeacherUserId)
			.limit(1)
			.single(),
	);
	return row.id;
}

/**
 * Teacher Availability INSERT/UPDATE/DELETE permissions:
 *
 * TEACHERS:
 * - Can insert/update/delete their own availability
 *
 * ADMIN/SITE_ADMIN:
 * - Can insert/update/delete availability for any teacher
 *
 * STAFF:
 * - Cannot insert/update/delete availability (only SELECT)
 *
 * OTHER USERS:
 * - Cannot insert/update/delete availability
 */
describe('RLS: teacher_availability INSERT - blocked for non-teacher/admin roles', () => {
	const newAvailability: TeacherAvailabilityInsert = {
		teacher_user_id: aliceTeacherUserId,
		day_of_week: 1,
		start_time: '09:00',
		end_time: '12:00',
	};

	it('user without role cannot insert availability', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);

		unwrapError(await db.from('teacher_availability').insert(newAvailability).select());
	});

	it('student cannot insert availability', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);

		unwrapError(await db.from('teacher_availability').insert(newAvailability).select());
	});

	it('staff cannot insert availability', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);

		unwrapError(await db.from('teacher_availability').insert(newAvailability).select());
	});
});

describe('RLS: teacher_availability INSERT - teacher permissions', () => {
	it('teacher can insert their own availability', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);

		const newAvailability: TeacherAvailabilityInsert = {
			teacher_user_id: aliceTeacherUserId,
			day_of_week: 4,
			start_time: '13:00',
			end_time: '16:00',
		};

		const [inserted] = unwrap(await db.from('teacher_availability').insert(newAvailability).select());

		expect(inserted.teacher_user_id).toBe(aliceTeacherUserId);

		unwrap(await dbNoRLS.from('teacher_availability').delete().eq('id', inserted.id).select());
	});

	it('teacher cannot insert availability for other teacher', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);

		const newAvailability: TeacherAvailabilityInsert = {
			teacher_user_id: bobTeacherUserId,
			day_of_week: 1,
			start_time: '09:00',
			end_time: '12:00',
		};

		unwrapError(await db.from('teacher_availability').insert(newAvailability).select());
	});
});

describe('RLS: teacher_availability INSERT - admin permissions', () => {
	it('admin can insert availability for any teacher', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);

		const newAvailability: TeacherAvailabilityInsert = {
			teacher_user_id: aliceTeacherUserId,
			day_of_week: 5,
			start_time: '10:00',
			end_time: '14:00',
		};

		const [inserted] = unwrap(await db.from('teacher_availability').insert(newAvailability).select());

		expect(inserted.teacher_user_id).toBe(aliceTeacherUserId);

		unwrap(await dbNoRLS.from('teacher_availability').delete().eq('id', inserted.id).select());
	});

	it('site_admin can insert availability for any teacher', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);

		const newAvailability: TeacherAvailabilityInsert = {
			teacher_user_id: bobTeacherUserId,
			day_of_week: 5,
			start_time: '10:00',
			end_time: '14:00',
		};

		const [inserted] = unwrap(await db.from('teacher_availability').insert(newAvailability).select());

		expect(inserted.teacher_user_id).toBe(bobTeacherUserId);

		unwrap(await dbNoRLS.from('teacher_availability').delete().eq('id', inserted.id).select());
	});
});

describe('RLS: teacher_availability UPDATE - blocked for non-teacher/admin roles', () => {
	it('user without role cannot update availability', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const existing = await getAliceAvailabilityRow();

		expect(
			unwrap(
				await db.from('teacher_availability').update({ start_time: '10:00' }).eq('id', existing.id).select(),
			),
		).toHaveLength(0);
	});

	it('staff cannot update availability', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);
		const existing = await getAliceAvailabilityRow();

		expect(
			unwrap(
				await db.from('teacher_availability').update({ start_time: '10:00' }).eq('id', existing.id).select(),
			),
		).toHaveLength(0);
	});
});

describe('RLS: teacher_availability UPDATE - teacher permissions', () => {
	it('teacher can update their own availability', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);
		const existing = await getAliceAvailabilityRow();

		const data = unwrap(
			await db.from('teacher_availability').update({ start_time: '10:00' }).eq('id', existing.id).select(),
		);

		expect(data).toHaveLength(1);

		unwrap(
			await dbNoRLS
				.from('teacher_availability')
				.update({ start_time: existing.start_time })
				.eq('id', existing.id)
				.select(),
		);
	});

	it('teacher cannot update other teachers availability', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);
		const bobAvailabilityId = await getBobAvailabilityId();

		expect(
			unwrap(
				await db
					.from('teacher_availability')
					.update({ start_time: '10:00' })
					.eq('id', bobAvailabilityId)
					.select(),
			),
		).toHaveLength(0);
	});
});

describe('RLS: teacher_availability UPDATE - admin permissions', () => {
	it('admin can update availability for any teacher', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);
		const existing = await getAliceAvailabilityRow();

		const data = unwrap(
			await db.from('teacher_availability').update({ start_time: '11:00' }).eq('id', existing.id).select(),
		);

		expect(data).toHaveLength(1);

		unwrap(
			await dbNoRLS
				.from('teacher_availability')
				.update({ start_time: existing.start_time })
				.eq('id', existing.id)
				.select(),
		);
	});
});

describe('RLS: teacher_availability DELETE - blocked for non-teacher/admin roles', () => {
	it('user without role cannot delete availability', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const existing = await getAliceAvailabilityRow();

		expect(unwrap(await db.from('teacher_availability').delete().eq('id', existing.id).select())).toHaveLength(0);
	});

	it('staff cannot delete availability', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);
		const existing = await getAliceAvailabilityRow();

		expect(unwrap(await db.from('teacher_availability').delete().eq('id', existing.id).select())).toHaveLength(0);
	});
});

describe('RLS: teacher_availability DELETE - teacher permissions', () => {
	it('teacher can delete their own availability', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);

		const inserted = unwrapSingleRow(
			await dbNoRLS
				.from('teacher_availability')
				.insert({
					teacher_user_id: aliceTeacherUserId,
					day_of_week: 6,
					start_time: '09:00',
					end_time: '12:00',
				})
				.select()
				.single(),
		);

		const data = unwrap(await db.from('teacher_availability').delete().eq('id', inserted.id).select());

		expect(data).toHaveLength(1);
	});

	it('teacher cannot delete other teachers availability', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);
		const bobAvailabilityId = await getBobAvailabilityId();

		expect(
			unwrap(await db.from('teacher_availability').delete().eq('id', bobAvailabilityId).select()),
		).toHaveLength(0);
	});
});

describe('RLS: teacher_availability DELETE - admin permissions', () => {
	it('admin can delete availability for any teacher', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);

		const inserted = unwrapSingleRow(
			await dbNoRLS
				.from('teacher_availability')
				.insert({
					teacher_user_id: aliceTeacherUserId,
					day_of_week: 6,
					start_time: '09:00',
					end_time: '12:00',
				})
				.select()
				.single(),
		);

		const data = unwrap(await db.from('teacher_availability').delete().eq('id', inserted.id).select());

		expect(data).toHaveLength(1);
	});
});

describe('RLS: teacher_availability validation', () => {
	it('end_time must be greater than start_time', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);

		const invalidAvailability: TeacherAvailabilityInsert = {
			teacher_user_id: aliceTeacherUserId,
			day_of_week: 1,
			start_time: '12:00',
			end_time: '09:00',
		};

		unwrapError(await db.from('teacher_availability').insert(invalidAvailability).select());
	});
});
