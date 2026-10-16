import { describe, expect, it } from 'bun:test';
import {
	buildTeacherInfoPath,
	parseTeacherInfoTab,
	resolveTeacherInfoBasePath,
	resolveTeacherInfoTabRedirect,
	resolveTeacherInfoTabRoute,
	teacherAddressFieldsFromProfile,
} from '../../../src/lib/teachers/teacherInfoTabsHelpers';
import type { Teacher } from '../../../src/types/teachers';

const baseTeacher = {
	user_id: 'teacher-1',
	email: 'a@test.nl',
	first_name: 'Ada',
	last_name: 'Docent',
	phone_number: null,
	avatar_url: null,
	bio: null,
	coc_issued_on: null,
	is_active: true,
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
	created_by: null,
	updated_by: null,
	street_name: null,
	house_number: null,
	postal_code: null,
	city: null,
} as Teacher;

describe('parseTeacherInfoTab', () => {
	it('returns profile for missing or invalid tabs', () => {
		expect(parseTeacherInfoTab(undefined)).toBe('profile');
		expect(parseTeacherInfoTab('unknown')).toBe('profile');
	});

	it('keeps valid tab ids', () => {
		expect(parseTeacherInfoTab('address')).toBe('address');
		expect(parseTeacherInfoTab('agenda')).toBe('agenda');
	});
});

describe('teacher info tab routes', () => {
	it('builds paths for teacher id and my-profile', () => {
		expect(resolveTeacherInfoBasePath('teacher-1')).toBe('/teachers/teacher-1');
		expect(resolveTeacherInfoBasePath(undefined)).toBe('/teachers/my-profile');
		expect(resolveTeacherInfoTabRoute('/teachers/teacher-1', 'agenda')).toBe('/teachers/teacher-1/agenda');
		expect(buildTeacherInfoPath('teacher-1')).toBe('/teachers/teacher-1/profile');
		expect(buildTeacherInfoPath('teacher-1', 'address')).toBe('/teachers/teacher-1/address');
	});

	it('redirects when the tab segment is missing or invalid', () => {
		expect(resolveTeacherInfoTabRedirect('/teachers/teacher-1', undefined)).toBe('/teachers/teacher-1/profile');
		expect(resolveTeacherInfoTabRedirect('/teachers/teacher-1', 'nope')).toBe('/teachers/teacher-1/profile');
		expect(resolveTeacherInfoTabRedirect('/teachers/teacher-1', 'profile')).toBeNull();
	});
});

describe('teacherAddressFieldsFromProfile', () => {
	it('maps address fields and defaults country to NL when missing', () => {
		expect(teacherAddressFieldsFromProfile(baseTeacher)).toEqual({
			street_name: null,
			house_number: null,
			postal_code: null,
			city: null,
			country_code: 'NL',
		});
	});

	it('keeps provided address values including country_code', () => {
		expect(
			teacherAddressFieldsFromProfile({
				...baseTeacher,
				street_name: 'Hoofdstraat',
				house_number: '12',
				postal_code: '1234 AB',
				city: 'Amsterdam',
				country_code: 'BE',
			}),
		).toEqual({
			street_name: 'Hoofdstraat',
			house_number: '12',
			postal_code: '1234 AB',
			city: 'Amsterdam',
			country_code: 'BE',
		});
	});
});
