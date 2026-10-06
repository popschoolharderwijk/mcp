import { describe, expect, it } from 'bun:test';
import {
	assignableRoles,
	buildCreatedUserInfo,
	buildCreateUserPayload,
	buildProfileUpdatePayload,
	getUserFormDialogCopy,
	hasUserFormChanges,
	isUserRoleLocked,
	parseUserRoleSelectValue,
	resolveUserFormSubmitDisabled,
	trimUserFormState,
	validateUserFormSubmit,
} from '../../../src/lib/users/userFormHelpers';

const baseForm = {
	email: 'user@example.com',
	first_name: 'Anna',
	last_name: 'Jansen',
	phone_number: '0612345678',
	role: 'admin' as const,
};

describe('trimUserFormState', () => {
	it('collapses whitespace in names and trims email and phone', () => {
		expect(
			trimUserFormState({
				email: '\tuser@example.com  ',
				first_name: '\tAnna   Marie\n',
				last_name: 'van   der  Berg',
				phone_number: ' 0612345678 ',
				role: null,
			}),
		).toEqual({
			email: 'user@example.com',
			first_name: 'Anna Marie',
			last_name: 'van der Berg',
			phone_number: '0612345678',
			role: null,
		});
	});
});

describe('validateUserFormSubmit', () => {
	it('requires email', () => {
		expect(
			validateUserFormSubmit({ email: '', first_name: '', last_name: '', phone_number: '', role: null }, true),
		).toEqual({ ok: false, message: 'Email is verplicht' });
	});

	it('requires email when only whitespace', () => {
		expect(
			validateUserFormSubmit({ email: '   ', first_name: '', last_name: '', phone_number: '', role: null }, true),
		).toEqual({ ok: false, message: 'Email is verplicht' });
	});

	it('blocks site_admin assignment for non site admins', () => {
		expect(
			validateUserFormSubmit(
				{
					email: 'admin@example.com',
					first_name: '',
					last_name: '',
					phone_number: '',
					role: 'site_admin',
				},
				false,
			),
		).toEqual({
			ok: false,
			message: 'Geen toegang',
			description: 'Admins kunnen geen site_admin rollen toewijzen.',
		});
	});
});

describe('assignableRoles', () => {
	it('includes site_admin for site admins', () => {
		expect(assignableRoles(true)).toContain('site_admin');
	});

	it('excludes site_admin for regular admins', () => {
		expect(assignableRoles(false)).not.toContain('site_admin');
	});
});

describe('buildProfileUpdatePayload', () => {
	it('maps empty strings to null', () => {
		expect(
			buildProfileUpdatePayload({
				email: 'user@example.com',
				first_name: '',
				last_name: 'Jansen',
				phone_number: '',
				role: null,
			}),
		).toEqual({
			email: 'user@example.com',
			first_name: null,
			last_name: 'Jansen',
			phone_number: null,
		});
	});

	it('trims string fields before mapping', () => {
		expect(
			buildProfileUpdatePayload({
				email: '  user@example.com  ',
				first_name: ' Anna ',
				last_name: '  ',
				phone_number: ' 0612345678 ',
				role: null,
			}),
		).toEqual({
			email: 'user@example.com',
			first_name: 'Anna',
			last_name: null,
			phone_number: '0612345678',
		});
	});
});

describe('buildCreateUserPayload', () => {
	it('omits empty optional fields', () => {
		expect(
			buildCreateUserPayload({
				email: 'user@example.com',
				first_name: '',
				last_name: 'Jansen',
				phone_number: '',
				role: 'admin',
			}),
		).toEqual({
			email: 'user@example.com',
			first_name: undefined,
			last_name: 'Jansen',
			phone_number: undefined,
			role: 'admin',
		});
	});

	it('trims string fields before mapping', () => {
		expect(
			buildCreateUserPayload({
				email: '  user@example.com  ',
				first_name: ' Anna ',
				last_name: ' Jansen ',
				phone_number: '  ',
				role: 'admin',
			}),
		).toEqual({
			email: 'user@example.com',
			first_name: 'Anna',
			last_name: 'Jansen',
			phone_number: undefined,
			role: 'admin',
		});
	});
});

describe('buildCreatedUserInfo', () => {
	it('builds created user from response data', () => {
		expect(
			buildCreatedUserInfo(
				{
					email: 'user@example.com',
					first_name: 'Anna',
					last_name: '',
					phone_number: '0612345678',
					role: null,
				},
				{ user_id: 'user-1', email: 'user@example.com' },
			),
		).toEqual({
			user_id: 'user-1',
			email: 'user@example.com',
			first_name: 'Anna',
			last_name: null,
			avatar_url: null,
			phone_number: '0612345678',
		});
	});
});

describe('getUserFormDialogCopy', () => {
	it('returns create mode labels', () => {
		expect(
			getUserFormDialogCopy(false, {
				email: 'user@example.com',
				first_name: '',
				last_name: '',
				phone_number: '',
				role: null,
			}),
		).toEqual({
			dialogTitle: 'Nieuwe gebruiker toevoegen',
			dialogDescription: 'Voeg een nieuwe gebruiker toe aan het systeem.',
			submitLabel: 'Toevoegen',
			savingLabel: 'Toevoegen...',
		});
	});
});

describe('parseUserRoleSelectValue', () => {
	it('returns null for the none option', () => {
		expect(parseUserRoleSelectValue('none')).toBeNull();
	});

	it('returns the selected role', () => {
		expect(parseUserRoleSelectValue('admin')).toBe('admin');
	});
});

describe('isUserRoleLocked', () => {
	it('locks site_admin role for regular admins in edit mode', () => {
		expect(isUserRoleLocked(true, true, false, 'site_admin')).toBe(true);
	});

	it('does not lock roles in create mode', () => {
		expect(isUserRoleLocked(false, true, false, 'site_admin')).toBe(false);
	});
});

describe('hasUserFormChanges', () => {
	it('returns false when only whitespace normalization differs', () => {
		expect(hasUserFormChanges(baseForm, { ...baseForm, first_name: ' Anna ' })).toBe(false);
		expect(
			hasUserFormChanges({ ...baseForm, first_name: 'Anna Marie' }, { ...baseForm, first_name: 'Anna   Marie' }),
		).toBe(false);
		expect(hasUserFormChanges(baseForm, { ...baseForm, first_name: '\tAnna\n' })).toBe(false);
	});

	it('returns true when role changed', () => {
		expect(hasUserFormChanges(baseForm, { ...baseForm, role: null })).toBe(true);
	});
});

describe('resolveUserFormSubmitDisabled', () => {
	it('disables create submit when email is only whitespace', () => {
		expect(resolveUserFormSubmitDisabled(false, { ...baseForm, email: '   ' }, baseForm)).toBe(true);
	});

	it('enables create submit with email even without changes', () => {
		expect(resolveUserFormSubmitDisabled(false, baseForm, baseForm)).toBe(false);
	});

	it('disables edit submit when only whitespace changed', () => {
		expect(resolveUserFormSubmitDisabled(true, { ...baseForm, last_name: ' Jansen ' }, baseForm)).toBe(true);
	});

	it('enables edit submit when something changed', () => {
		expect(resolveUserFormSubmitDisabled(true, { ...baseForm, last_name: 'De Vries' }, baseForm)).toBe(false);
	});
});
