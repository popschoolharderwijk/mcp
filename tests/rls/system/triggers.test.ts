import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs, createClientBypassRLS } from '../../db';
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

const { requireProfile, allUserRoles } = fixtures;

describe('Triggers: profiles immutability', () => {
	it('user_id cannot be changed', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const profile = requireProfile(TestUsers.STUDENT_001);
		const fakeUserId = '00000000-0000-0000-0000-999999999999';

		const error = unwrapError(
			await db.from('profiles').update({ user_id: fakeUserId }).eq('user_id', profile.user_id).select(),
		);

		// Trigger should raise exception: 'user_id is immutable'
		expect(error.message).toContain('user_id is immutable');
	});

	it('email cannot be changed directly on profiles', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const profile = requireProfile(TestUsers.STUDENT_001);

		const { error } = await db
			.from('profiles')
			.update({ email: 'hacked@test.nl' })
			.eq('user_id', profile.user_id)
			.select();

		// Trigger should raise exception: 'profiles.email is read-only'
		expect(error).not.toBeNull();
		expect(error?.message).toContain('profiles.email is read-only');
	});

	it('updated_at is automatically updated on profile change', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const profile = requireProfile(TestUsers.STUDENT_001);
		const originalUpdatedAt = profile.updated_at;

		// Wait a moment to ensure time difference
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Update a valid field
		const data = unwrap(
			await db
				.from('profiles')
				.update({ first_name: 'Trigger', last_name: 'Test' })
				.eq('user_id', profile.user_id)
				.select(),
		);

		expect(data).toHaveLength(1);
		expect(data[0]?.first_name).toBe('Trigger');
		expect(data[0]?.last_name).toBe('Test');

		// Verify updated_at changed (trigger sets it to now())
		const newUpdatedAt = data[0]?.updated_at;
		expect(newUpdatedAt).not.toBe(originalUpdatedAt);

		// Restore original name
		await db
			.from('profiles')
			.update({ first_name: profile.first_name, last_name: profile.last_name })
			.eq('user_id', profile.user_id);
	});

	it('collapses and trims profile names including tabs, and nullifies blanks', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const profile = requireProfile(TestUsers.STUDENT_001);

		const trimmed = unwrap(
			await db
				.from('profiles')
				.update({ first_name: '\tAnna   Marie\n', last_name: '  van   der  Berg  ' })
				.eq('user_id', profile.user_id)
				.select(),
		);

		expect(trimmed).toHaveLength(1);
		expect(trimmed[0]?.first_name).toBe('Anna Marie');
		expect(trimmed[0]?.last_name).toBe('van der Berg');

		const blanked = unwrap(
			await db
				.from('profiles')
				.update({ first_name: '\t\n', last_name: '   ' })
				.eq('user_id', profile.user_id)
				.select(),
		);

		expect(blanked).toHaveLength(1);
		expect(blanked[0]?.first_name).toBeNull();
		expect(blanked[0]?.last_name).toBeNull();

		await db
			.from('profiles')
			.update({ first_name: profile.first_name, last_name: profile.last_name })
			.eq('user_id', profile.user_id);
	});

	it('trims leading and trailing whitespace on phone_number', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const profile = requireProfile(TestUsers.STUDENT_001);
		const originalPhoneNumber = profile.phone_number;

		const data = unwrap(
			await db
				.from('profiles')
				.update({ phone_number: '\t0612345678\n' })
				.eq('user_id', profile.user_id)
				.select(),
		);

		expect(data).toHaveLength(1);
		expect(data[0]?.phone_number).toBe('0612345678');

		await db.from('profiles').update({ phone_number: originalPhoneNumber }).eq('user_id', profile.user_id);
	});
});

describe('Triggers: students text normalize', () => {
	it('collapses parent/debtor text and nullifies blanks', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);
		const studentUserId = fixtures.requireStudentId(TestUsers.STUDENT_001);
		const original = unwrapSingleRow(
			await db
				.from('students')
				.select('parent_name, debtor_name, debtor_info_same_as_student')
				.eq('user_id', studentUserId)
				.single(),
		);

		const collapsed = unwrapSingleRow(
			await db
				.from('students')
				.update({
					parent_name: '\tOuder   Anna\n',
					debtor_info_same_as_student: false,
					debtor_name: '  Debiteur   BV  ',
				})
				.eq('user_id', studentUserId)
				.select('parent_name, debtor_name')
				.single(),
		);

		expect(collapsed.parent_name).toBe('Ouder Anna');
		expect(collapsed.debtor_name).toBe('Debiteur BV');

		const blanked = unwrapSingleRow(
			await db
				.from('students')
				.update({ parent_name: '\t\n', debtor_name: '   ' })
				.eq('user_id', studentUserId)
				.select('parent_name, debtor_name')
				.single(),
		);

		expect(blanked.parent_name).toBeNull();
		expect(blanked.debtor_name).toBeNull();

		await db
			.from('students')
			.update({
				parent_name: original.parent_name,
				debtor_name: original.debtor_name,
				debtor_info_same_as_student: original.debtor_info_same_as_student,
			})
			.eq('user_id', studentUserId);
	});
});

describe('Triggers: teachers text normalize', () => {
	it('trims bio ends without collapsing internal spaces', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);
		const teacherUserId = fixtures.requireTeacherId(TestUsers.TEACHER_ALICE);
		const original = unwrapSingleRow(await db.from('teachers').select('bio').eq('user_id', teacherUserId).single());

		const trimmed = unwrapSingleRow(
			await db
				.from('teachers')
				.update({ bio: '\tHello   world\n' })
				.eq('user_id', teacherUserId)
				.select('bio')
				.single(),
		);

		expect(trimmed.bio).toBe('Hello   world');

		const blanked = unwrapSingleRow(
			await db.from('teachers').update({ bio: '\t\n' }).eq('user_id', teacherUserId).select('bio').single(),
		);

		expect(blanked.bio).toBeNull();

		await db.from('teachers').update({ bio: original.bio }).eq('user_id', teacherUserId);
	});
});

describe('Triggers: last site_admin protection', () => {
	it('last site_admin cannot be demoted', async () => {
		// We only have 1 site_admin, so this should be blocked by trigger
		const dbNoRLS = createClientBypassRLS();
		const siteAdminRole = allUserRoles.find((ur) => ur.role === 'site_admin');
		if (!siteAdminRole) {
			throw new Error('site_admin role not found in fixtures');
		}

		// Attempt to demote via service role (bypasses RLS but not trigger)
		const error = unwrapError(
			await dbNoRLS.from('user_roles').update({ role: 'admin' }).eq('user_id', siteAdminRole.user_id).select(),
		);

		// Trigger should block: 'Cannot remove the last site_admin'
		expect(error.message).toContain('Cannot remove the last site_admin');
	});

	it('last site_admin role cannot be deleted', async () => {
		const dbNoRLS = createClientBypassRLS();
		const siteAdminRole = allUserRoles.find((ur) => ur.role === 'site_admin');
		if (!siteAdminRole) {
			throw new Error('site_admin role not found in fixtures');
		}

		// Attempt to delete the role via service role
		const { error } = await dbNoRLS.from('user_roles').delete().eq('user_id', siteAdminRole.user_id).select();

		// Trigger should block
		expect(error).not.toBeNull();
		expect(error?.message).toContain('Cannot remove the last site_admin');
	});

	it('site_admin can be demoted if another site_admin exists', async () => {
		const dbNoRLS = createClientBypassRLS();
		const siteAdminRole = allUserRoles.find((ur) => ur.role === 'site_admin');
		const adminRole = allUserRoles.find((ur) => ur.role === 'admin');

		if (!siteAdminRole || !adminRole) {
			throw new Error('Required roles not found in fixtures');
		}

		// First, promote admin-one to site_admin
		const { error: promoteError } = await dbNoRLS
			.from('user_roles')
			.update({ role: 'site_admin' })
			.eq('user_id', adminRole.user_id);

		expect(promoteError).toBeNull();

		// Now we can demote the original site_admin (there are 2 now)
		const data = unwrap(
			await dbNoRLS.from('user_roles').update({ role: 'admin' }).eq('user_id', siteAdminRole.user_id).select(),
		);

		expect(data).toHaveLength(1);
		expect(data[0]?.role).toBe('admin');

		// Restore: re-promote original site_admin and demote the temp one
		await dbNoRLS.from('user_roles').update({ role: 'site_admin' }).eq('user_id', siteAdminRole.user_id);

		await dbNoRLS.from('user_roles').update({ role: 'admin' }).eq('user_id', adminRole.user_id);
	});
});

// Defense-in-depth: trigger bodies do not need EXECUTE on the session role to run, but
// denying EXECUTE avoids exposing them as PostgREST RPCs and catches accidental GRANTs.
describe('Trigger-only functions: no EXECUTE for authenticated', () => {
	it('authenticated role has no EXECUTE on trigger_ensure_student_on_agreement_insert', async () => {
		const db = createClientBypassRLS();
		const data = unwrap(
			await db.rpc('authenticated_has_execute_on', {
				p_regprocedure: 'public.trigger_ensure_student_on_agreement_insert()',
			}),
		);
		expect(data).toBe(false);
	});

	it('authenticated role has no EXECUTE on trigger_cleanup_student_on_agreement_delete', async () => {
		const db = createClientBypassRLS();
		const data = unwrap(
			await db.rpc('authenticated_has_execute_on', {
				p_regprocedure: 'public.trigger_cleanup_student_on_agreement_delete()',
			}),
		);
		expect(data).toBe(false);
	});
});
