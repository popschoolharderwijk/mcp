import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs } from '../../db';
import { unwrap } from '../../utils';
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

const { requireProfile, requireUserId } = fixtures;

describe('RLS: profiles UPDATE - own profile', () => {
	it('user without role can update own profile', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const profile = requireProfile(TestUsers.STUDENT_001);

		const data = unwrap(
			await db
				.from('profiles')
				.update({ first_name: 'Updated', last_name: 'User A' })
				.eq('user_id', profile.user_id)
				.select(),
		);

		expect(data).toHaveLength(1);
		expect(data[0].first_name).toBe('Updated');
		expect(data[0].last_name).toBe('User A');

		unwrap(
			await db
				.from('profiles')
				.update({ first_name: profile.first_name, last_name: profile.last_name })
				.eq('user_id', profile.user_id)
				.select('user_id'),
		);
	});

	it('teacher can update own profile', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);
		const profile = requireProfile(TestUsers.TEACHER_ALICE);

		const data = unwrap(
			await db
				.from('profiles')
				.update({ first_name: 'Updated', last_name: 'Alice' })
				.eq('user_id', profile.user_id)
				.select(),
		);

		expect(data).toHaveLength(1);
		expect(data[0].first_name).toBe('Updated');
		expect(data[0].last_name).toBe('Alice');

		unwrap(
			await db
				.from('profiles')
				.update({ first_name: profile.first_name, last_name: profile.last_name })
				.eq('user_id', profile.user_id)
				.select('user_id'),
		);
	});

	it('staff can update own profile', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);
		const profile = requireProfile(TestUsers.STAFF_ONE);

		const data = unwrap(
			await db
				.from('profiles')
				.update({ first_name: 'Updated', last_name: 'Staff' })
				.eq('user_id', profile.user_id)
				.select(),
		);

		expect(data).toHaveLength(1);
		expect(data[0].first_name).toBe('Updated');
		expect(data[0].last_name).toBe('Staff');

		unwrap(
			await db
				.from('profiles')
				.update({ first_name: profile.first_name, last_name: profile.last_name })
				.eq('user_id', profile.user_id)
				.select('user_id'),
		);
	});

	it('admin can update own profile', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);
		const profile = requireProfile(TestUsers.ADMIN_ONE);

		const data = unwrap(
			await db
				.from('profiles')
				.update({ first_name: 'Updated', last_name: 'Admin' })
				.eq('user_id', profile.user_id)
				.select(),
		);

		expect(data).toHaveLength(1);
		expect(data[0].first_name).toBe('Updated');
		expect(data[0].last_name).toBe('Admin');

		unwrap(
			await db
				.from('profiles')
				.update({ first_name: profile.first_name, last_name: profile.last_name })
				.eq('user_id', profile.user_id)
				.select('user_id'),
		);
	});

	it('site_admin can update own profile', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);
		const profile = requireProfile(TestUsers.SITE_ADMIN);

		const data = unwrap(
			await db
				.from('profiles')
				.update({ first_name: 'Updated', last_name: 'Site Admin' })
				.eq('user_id', profile.user_id)
				.select(),
		);

		expect(data).toHaveLength(1);
		expect(data[0].first_name).toBe('Updated');
		expect(data[0].last_name).toBe('Site Admin');

		unwrap(
			await db
				.from('profiles')
				.update({ first_name: profile.first_name, last_name: profile.last_name })
				.eq('user_id', profile.user_id)
				.select('user_id'),
		);
	});
});

describe('RLS: profiles UPDATE - other profiles', () => {
	it('user without role cannot update other profiles', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const targetUserId = requireUserId(TestUsers.STUDENT_002);

		expect(
			unwrap(
				await db
					.from('profiles')
					.update({ first_name: 'Hacked', last_name: null })
					.eq('user_id', targetUserId)
					.select(),
			),
		).toHaveLength(0);
	});

	it('teacher cannot update other profiles', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);
		const targetUserId = requireUserId(TestUsers.STUDENT_001);

		expect(
			unwrap(
				await db
					.from('profiles')
					.update({ first_name: 'Hacked', last_name: null })
					.eq('user_id', targetUserId)
					.select(),
			),
		).toHaveLength(0);
	});

	it('staff cannot update other profiles', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);
		const teacherUserId = requireUserId(TestUsers.TEACHER_ALICE);

		expect(
			unwrap(
				await db
					.from('profiles')
					.update({ first_name: 'Hacked', last_name: null })
					.eq('user_id', teacherUserId)
					.select(),
			),
		).toHaveLength(0);
	});

	it('admin can update any profile', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);
		const teacherUserId = requireUserId(TestUsers.TEACHER_BOB);
		const originalProfile = requireProfile(TestUsers.TEACHER_BOB);

		const data = unwrap(
			await db
				.from('profiles')
				.update({ first_name: 'Admin', last_name: 'Updated' })
				.eq('user_id', teacherUserId)
				.select(),
		);

		expect(data).toHaveLength(1);
		expect(data[0].first_name).toBe('Admin');
		expect(data[0].last_name).toBe('Updated');

		unwrap(
			await db
				.from('profiles')
				.update({ first_name: originalProfile.first_name, last_name: originalProfile.last_name })
				.eq('user_id', teacherUserId)
				.select('user_id'),
		);
	});

	it('site_admin can update any profile', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);
		const staffUserId = requireUserId(TestUsers.STAFF_ONE);
		const originalProfile = requireProfile(TestUsers.STAFF_ONE);

		const data = unwrap(
			await db
				.from('profiles')
				.update({ first_name: 'Site Admin', last_name: 'Updated' })
				.eq('user_id', staffUserId)
				.select(),
		);

		expect(data).toHaveLength(1);
		expect(data[0].first_name).toBe('Site Admin');
		expect(data[0].last_name).toBe('Updated');

		unwrap(
			await db
				.from('profiles')
				.update({ first_name: originalProfile.first_name, last_name: originalProfile.last_name })
				.eq('user_id', staffUserId)
				.select('user_id'),
		);
	});
});
