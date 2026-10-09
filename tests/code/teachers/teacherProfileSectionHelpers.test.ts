import { describe, expect, it } from 'bun:test';
import {
	applyTeacherProfileInitials,
	buildTeacherProfileNameUpdate,
	buildTeacherProfileUpdate,
	canSaveTeacherProfile,
	createTeacherProfileFormState,
	isTeacherProfileCocValid,
	mapLoadedTeacherProfile,
	shouldFetchTeacherProfile,
	shouldStartProfileLoading,
} from '../../../src/lib/teachers/teacherProfileSectionHelpers';

describe('shouldStartProfileLoading', () => {
	it('returns true when no initial profile data exists', () => {
		expect(shouldStartProfileLoading({})).toBe(true);
	});

	it('returns false when initial first name exists', () => {
		expect(shouldStartProfileLoading({ initialFirstName: 'Jan' })).toBe(false);
	});
});

describe('shouldFetchTeacherProfile', () => {
	it('returns false when initial data is already provided', () => {
		expect(shouldFetchTeacherProfile({ initialBio: 'Bio' }, 'teacher-1', 'user-1')).toBe(false);
	});

	it('returns true when ids exist and no initial data is provided', () => {
		expect(shouldFetchTeacherProfile({}, 'teacher-1', 'user-1')).toBe(true);
	});
});

describe('mapLoadedTeacherProfile', () => {
	it('maps teacher and profile fields and marks VOG present when date exists', () => {
		expect(
			mapLoadedTeacherProfile(
				{ bio: 'Docent bio', coc_issued_on: '2023-12-06' },
				{ first_name: 'Jan', last_name: 'Docent', email: 'jan@example.com', phone_number: '0612345678' },
			),
		).toEqual({
			bio: 'Docent bio',
			cocIssuedOn: '2023-12-06',
			hasCoc: true,
			firstName: 'Jan',
			lastName: 'Docent',
			email: 'jan@example.com',
			phoneNumber: '0612345678',
		});
	});

	it('marks VOG absent when issue date is null', () => {
		expect(
			mapLoadedTeacherProfile(
				{ bio: null, coc_issued_on: null },
				{ first_name: 'Jan', last_name: 'Docent', email: null, phone_number: null },
			),
		).toEqual({
			bio: '',
			cocIssuedOn: '',
			hasCoc: false,
			firstName: 'Jan',
			lastName: 'Docent',
			email: '',
			phoneNumber: '',
		});
	});
});

describe('isTeacherProfileCocValid', () => {
	it('allows save when VOG is off even without a date', () => {
		expect(isTeacherProfileCocValid({ hasCoc: false, cocIssuedOn: '' })).toBe(true);
	});

	it('requires a date when VOG is on', () => {
		expect(isTeacherProfileCocValid({ hasCoc: true, cocIssuedOn: '' })).toBe(false);
		expect(isTeacherProfileCocValid({ hasCoc: true, cocIssuedOn: '2023-12-06' })).toBe(true);
	});
});

describe('buildTeacherProfileUpdate', () => {
	it('clears coc date when VOG is off', () => {
		expect(
			buildTeacherProfileUpdate({
				bio: '',
				hasCoc: false,
				cocIssuedOn: '2023-12-06',
				firstName: 'Jan',
				lastName: 'Docent',
				phoneNumber: '',
			}),
		).toEqual({
			bio: null,
			coc_issued_on: null,
		});
	});

	it('persists coc date when VOG is on', () => {
		expect(
			buildTeacherProfileUpdate({
				bio: '\tHello   world\n',
				hasCoc: true,
				cocIssuedOn: '2023-12-06',
				firstName: 'Jan',
				lastName: 'Docent',
				phoneNumber: '',
			}),
		).toEqual({
			bio: 'Hello   world',
			coc_issued_on: '2023-12-06',
		});
	});
});

describe('buildTeacherProfileNameUpdate', () => {
	it('collapses whitespace in names, trims phone, and nullifies blanks', () => {
		expect(
			buildTeacherProfileNameUpdate({
				bio: '',
				hasCoc: false,
				cocIssuedOn: '',
				firstName: '\tJan   Piet  ',
				lastName: '  ',
				phoneNumber: ' 0612345678 ',
			}),
		).toEqual({
			first_name: 'Jan Piet',
			last_name: null,
			phone_number: '0612345678',
		});
	});
});

describe('canSaveTeacherProfile', () => {
	it('returns true when all save preconditions are met', () => {
		expect(canSaveTeacherProfile('teacher-1', 'user-1', true, true)).toBe(true);
	});

	it('returns false when editing is disabled', () => {
		expect(canSaveTeacherProfile('teacher-1', 'user-1', false, true)).toBe(false);
	});
});

describe('createTeacherProfileFormState', () => {
	it('builds initial form state from props including VOG flag', () => {
		expect(
			createTeacherProfileFormState({
				initialBio: 'Bio',
				initialFirstName: 'Jan',
				initialLastName: 'Docent',
				initialEmail: 'jan@example.com',
				initialPhoneNumber: '0612345678',
				initialCocIssuedOn: '2023-12-06',
			}),
		).toEqual({
			bio: 'Bio',
			firstName: 'Jan',
			lastName: 'Docent',
			email: 'jan@example.com',
			phoneNumber: '0612345678',
			cocIssuedOn: '2023-12-06',
			hasCoc: true,
		});
	});
});

describe('applyTeacherProfileInitials', () => {
	it('updates only provided initial fields', () => {
		expect(
			applyTeacherProfileInitials(
				{
					bio: 'Current bio',
					firstName: 'Current',
					lastName: 'Name',
					email: 'current@example.com',
					phoneNumber: '0612345678',
					cocIssuedOn: '',
					hasCoc: false,
				},
				{ initialBio: 'New bio' },
			),
		).toEqual({
			bio: 'New bio',
			firstName: 'Current',
			lastName: 'Name',
			email: 'current@example.com',
			phoneNumber: '0612345678',
			cocIssuedOn: '',
			hasCoc: false,
		});
	});
});
