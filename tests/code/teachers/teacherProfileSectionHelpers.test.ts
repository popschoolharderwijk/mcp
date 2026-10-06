import { describe, expect, it } from 'bun:test';
import {
	applyTeacherProfileInitials,
	buildTeacherProfileNameUpdate,
	buildTeacherProfileUpdate,
	canSaveTeacherProfile,
	createTeacherProfileFormState,
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
	it('maps teacher and profile fields', () => {
		expect(
			mapLoadedTeacherProfile(
				{ bio: 'Docent bio', has_vog: true, vog_expires_at: '2027-01-01' },
				{ first_name: 'Jan', last_name: 'Docent', phone_number: '0612345678' },
			),
		).toEqual({
			bio: 'Docent bio',
			hasVog: true,
			vogExpiresAt: '2027-01-01',
			firstName: 'Jan',
			lastName: 'Docent',
			phoneNumber: '0612345678',
		});
	});
});

describe('buildTeacherProfileUpdate', () => {
	it('maps empty bio and expiry to null', () => {
		expect(
			buildTeacherProfileUpdate({
				bio: '',
				hasVog: false,
				vogExpiresAt: '',
				firstName: 'Jan',
				lastName: 'Docent',
				phoneNumber: '',
			}),
		).toEqual({
			bio: null,
			has_vog: false,
			vog_expires_at: null,
		});
	});

	it('trims bio without collapsing internal spaces', () => {
		expect(
			buildTeacherProfileUpdate({
				bio: '\tHello   world\n',
				hasVog: true,
				vogExpiresAt: '2027-01-01',
				firstName: 'Jan',
				lastName: 'Docent',
				phoneNumber: '',
			}),
		).toEqual({
			bio: 'Hello   world',
			has_vog: true,
			vog_expires_at: '2027-01-01',
		});
	});
});

describe('buildTeacherProfileNameUpdate', () => {
	it('collapses whitespace in names, trims phone, and nullifies blanks', () => {
		expect(
			buildTeacherProfileNameUpdate({
				bio: '',
				hasVog: false,
				vogExpiresAt: '',
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
	it('builds initial form state from props', () => {
		expect(
			createTeacherProfileFormState({
				initialBio: 'Bio',
				initialFirstName: 'Jan',
				initialLastName: 'Docent',
				initialPhoneNumber: '0612345678',
				initialHasVog: true,
				initialVogExpiresAt: '2027-01-01',
			}),
		).toEqual({
			bio: 'Bio',
			firstName: 'Jan',
			lastName: 'Docent',
			phoneNumber: '0612345678',
			hasVog: true,
			vogExpiresAt: '2027-01-01',
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
					phoneNumber: '0612345678',
					hasVog: false,
					vogExpiresAt: '',
				},
				{ initialBio: 'New bio' },
			),
		).toEqual({
			bio: 'New bio',
			firstName: 'Current',
			lastName: 'Name',
			phoneNumber: '0612345678',
			hasVog: false,
			vogExpiresAt: '',
		});
	});
});
