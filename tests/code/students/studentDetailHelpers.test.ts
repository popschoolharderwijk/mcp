import { describe, expect, it } from 'bun:test';
import {
	buildStudentAvatarFallback,
	buildStudentInitials,
	formatStudentPhoneSubtitle,
	resolveStudentDetailPageContent,
} from '../../../src/lib/students/studentDetailHelpers';
import type { Student } from '../../../src/types/students';

const profile = {
	user_id: 'u-1',
	email: 'jan@test.nl',
	first_name: 'Jan',
	last_name: 'Leerling',
	phone_number: null,
	avatar_url: null,
};

const student = {
	user_id: 'u-1',
	email: 'jan@test.nl',
	first_name: 'Jan',
	last_name: 'Leerling',
	phone_number: null,
	avatar_url: null,
	created_at: '2026-01-01T00:00:00Z',
	created_by: null,
	date_of_birth: null,
	debtor_address: null,
	debtor_city: null,
	debtor_info_same_as_student: true,
	debtor_name: null,
	debtor_postal_code: null,
	parent_email: null,
	parent_name: null,
	parent_phone_number: null,
	updated_at: '2026-01-01T00:00:00Z',
	updated_by: null,
} as Student;

describe('buildStudentInitials', () => {
	it('combines first letters of names', () => {
		expect(buildStudentInitials(profile)).toBe('JL');
	});
});

describe('buildStudentAvatarFallback', () => {
	it('uses email prefix when initials are empty', () => {
		expect(
			buildStudentAvatarFallback(
				{
					user_id: 'u-1',
					email: 'jan@test.nl',
					first_name: null,
					last_name: null,
					phone_number: null,
					avatar_url: null,
				},
				'',
			),
		).toBe('JA');
	});
});

describe('formatStudentPhoneSubtitle', () => {
	it('includes phone number when available', () => {
		expect(formatStudentPhoneSubtitle('jan@test.nl', '0612345678')).toBe('jan@test.nl · 0612345678');
	});
});

describe('resolveStudentDetailPageContent', () => {
	it('returns loading content while auth is loading', () => {
		expect(
			resolveStudentDetailPageContent({
				authLoading: true,
				canView: true,
				loading: false,
				profile: null,
				student: null,
				userId: 'u-1',
				agreements: [],
				signupRequests: [],
			}),
		).toEqual({ kind: 'loading' });
	});

	it('returns loading content while page data is loading', () => {
		expect(
			resolveStudentDetailPageContent({
				authLoading: false,
				canView: true,
				loading: true,
				profile: null,
				student: null,
				userId: 'u-1',
				agreements: [],
				signupRequests: [],
			}),
		).toEqual({ kind: 'loading' });
	});

	it('keeps body content while refreshing after profile and student are loaded', () => {
		expect(
			resolveStudentDetailPageContent({
				authLoading: false,
				canView: true,
				loading: true,
				profile,
				student,
				userId: 'u-1',
				agreements: [],
				signupRequests: [],
			}),
		).toEqual({
			kind: 'body',
			profile,
			student,
			userId: 'u-1',
			agreements: [],
			signupRequests: [],
		});
	});

	it('returns body content when profile and student are available', () => {
		expect(
			resolveStudentDetailPageContent({
				authLoading: false,
				canView: true,
				loading: false,
				profile,
				student,
				userId: 'u-1',
				agreements: [],
				signupRequests: [],
			}),
		).toEqual({
			kind: 'body',
			profile,
			student,
			userId: 'u-1',
			agreements: [],
			signupRequests: [],
		});
	});

	it('returns home redirect when user cannot view student detail', () => {
		expect(
			resolveStudentDetailPageContent({
				authLoading: false,
				canView: false,
				loading: false,
				profile: null,
				student: null,
				userId: 'u-1',
				agreements: [],
				signupRequests: [],
			}),
		).toEqual({ kind: 'redirect', to: '/' });
	});

	it('returns students redirect when profile is missing', () => {
		expect(
			resolveStudentDetailPageContent({
				authLoading: false,
				canView: true,
				loading: false,
				profile: null,
				student: null,
				userId: 'u-1',
				agreements: [],
				signupRequests: [],
			}),
		).toEqual({ kind: 'redirect', to: '/students' });
	});
});
