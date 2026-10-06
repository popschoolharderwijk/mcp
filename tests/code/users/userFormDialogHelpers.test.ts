import { describe, expect, it } from 'bun:test';
import {
	buildUserFormStateForOpen,
	handleUserFormDialogCancel,
	handleUserFormDialogOpenChange,
	runUserFormDialogSubmit,
} from '../../../src/lib/users/userFormDialogHelpers';
import type { UserFormState } from '../../../src/lib/users/userFormHelpers';

const emptyForm: UserFormState = {
	email: '',
	first_name: '',
	last_name: '',
	phone_number: '',
	role: null,
};

describe('buildUserFormStateForOpen', () => {
	it('returns the empty form for create mode', () => {
		expect(buildUserFormStateForOpen(undefined, emptyForm)).toEqual(emptyForm);
	});

	it('maps nullable user fields to form defaults', () => {
		expect(
			buildUserFormStateForOpen(
				{
					email: 'jan@example.com',
					first_name: null,
					last_name: 'Jansen',
					phone_number: null,
					role: 'admin',
				},
				emptyForm,
			),
		).toEqual({
			email: 'jan@example.com',
			first_name: '',
			last_name: 'Jansen',
			phone_number: '',
			role: 'admin',
		});
	});

	it('trims and collapses loaded user string fields', () => {
		expect(
			buildUserFormStateForOpen(
				{
					email: '  jan@example.com  ',
					first_name: ' Jan   Piet ',
					last_name: ' van   der  Berg ',
					phone_number: ' 0612345678 ',
					role: 'admin',
				},
				emptyForm,
			),
		).toEqual({
			email: 'jan@example.com',
			first_name: 'Jan Piet',
			last_name: 'van der Berg',
			phone_number: '0612345678',
			role: 'admin',
		});
	});
});

describe('handleUserFormDialogCancel', () => {
	it('ignores cancel while saving', () => {
		let closed = false;
		handleUserFormDialogCancel(
			true,
			() => {},
			emptyForm,
			(open) => {
				closed = !open;
			},
		);
		expect(closed).toBe(false);
	});

	it('resets the form and closes the dialog when not saving', () => {
		let nextForm: UserFormState = {
			email: 'jan@example.com',
			first_name: 'Jan',
			last_name: 'Jansen',
			phone_number: '',
			role: null,
		};
		let closed = false;
		handleUserFormDialogCancel(
			false,
			(form) => {
				nextForm = form;
			},
			emptyForm,
			(open) => {
				closed = !open;
			},
		);
		expect(nextForm).toEqual(emptyForm);
		expect(closed).toBe(true);
	});
});

describe('handleUserFormDialogOpenChange', () => {
	it('ignores open changes while saving', () => {
		let closed = false;
		handleUserFormDialogOpenChange(
			true,
			false,
			() => {},
			emptyForm,
			(open) => {
				closed = !open;
			},
		);
		expect(closed).toBe(false);
	});

	it('resets the form and closes the dialog when not saving', () => {
		let nextForm: UserFormState = {
			email: 'jan@example.com',
			first_name: 'Jan',
			last_name: 'Jansen',
			phone_number: '',
			role: null,
		};
		let closed = false;
		handleUserFormDialogOpenChange(
			false,
			false,
			(form) => {
				nextForm = form;
			},
			emptyForm,
			(open) => {
				closed = !open;
			},
		);
		expect(nextForm).toEqual(emptyForm);
		expect(closed).toBe(true);
	});
});

describe('runUserFormDialogSubmit', () => {
	it('returns early when submit fails', async () => {
		let closed = false;
		let successCalled = false;
		await runUserFormDialogSubmit({
			form: emptyForm,
			isSiteAdmin: false,
			isEditMode: false,
			editUser: undefined,
			setForm: () => {},
			emptyForm,
			onOpenChange: (open) => {
				closed = open;
			},
			onSuccess: () => {
				successCalled = true;
			},
			submitUserForm: async () => ({ ok: false, title: 'Opslaan mislukt' }),
		});
		expect(closed).toBe(false);
		expect(successCalled).toBe(false);
	});

	it('closes dialog and passes created user on create success', async () => {
		let nextForm: UserFormState = {
			email: 'jan@example.com',
			first_name: 'Jan',
			last_name: 'Jansen',
			phone_number: '',
			role: null,
		};
		let closed = true;
		let createdUserId: string | undefined;
		await runUserFormDialogSubmit({
			form: nextForm,
			isSiteAdmin: false,
			isEditMode: false,
			editUser: undefined,
			setForm: (form) => {
				nextForm = form;
			},
			emptyForm,
			onOpenChange: (open) => {
				closed = open;
			},
			onSuccess: (createdUser) => {
				createdUserId = createdUser?.user_id;
			},
			submitUserForm: async () => ({
				ok: true,
				mode: 'create',
				createdUser: {
					user_id: 'user-1',
					email: 'jan@example.com',
					first_name: 'Jan',
					last_name: 'Jansen',
					phone_number: null,
					avatar_url: null,
				},
			}),
		});
		expect(nextForm).toEqual(emptyForm);
		expect(closed).toBe(false);
		expect(createdUserId).toBe('user-1');
	});

	it('closes dialog without created user on edit success', async () => {
		let successCalled = false;
		let createdUserId: string | undefined = 'pending';
		await runUserFormDialogSubmit({
			form: emptyForm,
			isSiteAdmin: false,
			isEditMode: true,
			editUser: { user_id: 'user-1', role: 'admin' },
			setForm: () => {},
			emptyForm,
			onOpenChange: () => {},
			onSuccess: (createdUser) => {
				successCalled = true;
				createdUserId = createdUser?.user_id;
			},
			submitUserForm: async () => ({ ok: true, mode: 'edit' }),
		});
		expect(successCalled).toBe(true);
		expect(createdUserId).toBeUndefined();
	});
});
