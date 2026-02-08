import { describe, expect, it } from 'bun:test';
import { createClientAs, createClientBypassRLS } from '../../db';
import { fixtures } from '../fixtures';
import { TestUsers } from '../test-users';

const dbNoRLS = createClientBypassRLS();

// Setup: Create test availability records
const aliceTeacherId = fixtures.requireTeacherId(TestUsers.TEACHER_ALICE);
const bobTeacherId = fixtures.requireTeacherId(TestUsers.TEACHER_BOB);

// Create test availability before tests run
await dbNoRLS.from('teacher_availability').delete().eq('teacher_id', aliceTeacherId);
await dbNoRLS.from('teacher_availability').delete().eq('teacher_id', bobTeacherId);

await dbNoRLS
	.from('teacher_availability')
	.insert([
		{ teacher_id: aliceTeacherId, day_of_week: 1, start_time: '09:00', end_time: '12:00' },
		{ teacher_id: aliceTeacherId, day_of_week: 3, start_time: '14:00', end_time: '17:00' },
	])
	.select();

await dbNoRLS
	.from('teacher_availability')
	.insert([{ teacher_id: bobTeacherId, day_of_week: 2, start_time: '10:00', end_time: '13:00' }])
	.select();

/**
 * Teacher Availability SELECT permissions:
 *
 * TEACHERS:
 * - Can view their own availability only
 *
 * STAFF/ADMIN/SITE_ADMIN:
 * - Can view all availability
 *
 * OTHER USERS (students, users without role):
 * - Cannot view any availability
 */
describe('RLS: teacher_availability SELECT', () => {
	it('site_admin sees all availability', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);

		const { data, error } = await db.from('teacher_availability').select('*');

		expect(error).toBeNull();
		expect(data?.length).toBeGreaterThanOrEqual(3);
	});

	it('admin sees all availability', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);

		const { data, error } = await db.from('teacher_availability').select('*');

		expect(error).toBeNull();
		expect(data?.length).toBeGreaterThanOrEqual(3);
	});

	it('staff sees all availability', async () => {
		const db = await createClientAs(TestUsers.STAFF);

		const { data, error } = await db.from('teacher_availability').select('*');

		expect(error).toBeNull();
		expect(data?.length).toBeGreaterThanOrEqual(3);
	});

	it('teacher can see only their own availability', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);

		const { data, error } = await db.from('teacher_availability').select('*');

		expect(error).toBeNull();
		expect(data?.length).toBe(2);
		expect(data?.every((a) => a.teacher_id === aliceTeacherId)).toBe(true);
	});

	it('teacher cannot see other teachers availability', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);

		const { data, error } = await db.from('teacher_availability').select('*').eq('teacher_id', bobTeacherId);

		expect(error).toBeNull();
		expect(data).toHaveLength(0);
	});

	it('student cannot see any availability', async () => {
		const db = await createClientAs(TestUsers.STUDENT_A);

		const { data, error } = await db.from('teacher_availability').select('*');

		expect(error).toBeNull();
		expect(data).toHaveLength(0);
	});

	it('user without role cannot see any availability', async () => {
		const db = await createClientAs(TestUsers.USER_A);

		const { data, error } = await db.from('teacher_availability').select('*');

		expect(error).toBeNull();
		expect(data).toHaveLength(0);
	});
});
