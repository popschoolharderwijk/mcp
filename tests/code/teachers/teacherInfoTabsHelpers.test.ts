import { describe, expect, it } from 'bun:test';
import {
	buildTeacherInfoPath,
	resolveTeacherInfoBasePath,
	resolveTeacherInfoTabRedirect,
	resolveTeacherInfoTabRoute,
} from '../../../src/lib/teachers/teacherInfoTabsHelpers';

describe('teacher info tab routes', () => {
	it('builds paths for teacher id and own profile', () => {
		expect(resolveTeacherInfoBasePath('teacher-1')).toBe('/teachers/teacher-1');
		expect(resolveTeacherInfoBasePath(undefined)).toBe('/profile');
		expect(resolveTeacherInfoTabRoute('/teachers/teacher-1', 'agenda')).toBe('/teachers/teacher-1/agenda');
		expect(resolveTeacherInfoTabRoute('/profile', 'profile')).toBe('/profile');
		expect(buildTeacherInfoPath('teacher-1')).toBe('/teachers/teacher-1/profile');
		expect(buildTeacherInfoPath('teacher-1', 'address')).toBe('/teachers/teacher-1/address');
		expect(buildTeacherInfoPath('teacher-1', 'agreements')).toBe('/teachers/teacher-1/agreements');
		expect(buildTeacherInfoPath('teacher-1', 'availability')).toBe('/teachers/teacher-1/availability');
	});

	it('redirects when the tab segment is missing or invalid', () => {
		expect(resolveTeacherInfoTabRedirect('/teachers/teacher-1', undefined)).toBe('/teachers/teacher-1/profile');
		expect(resolveTeacherInfoTabRedirect('/teachers/teacher-1', 'nope')).toBe('/teachers/teacher-1/profile');
		expect(resolveTeacherInfoTabRedirect('/teachers/teacher-1', 'profile')).toBeNull();
		expect(resolveTeacherInfoTabRedirect('/teachers/teacher-1', 'agreements')).toBeNull();
		expect(resolveTeacherInfoTabRedirect('/teachers/teacher-1', 'availability')).toBeNull();
		expect(resolveTeacherInfoTabRedirect('/profile', undefined)).toBeNull();
		expect(resolveTeacherInfoTabRedirect('/profile', 'profile')).toBe('/profile');
		expect(resolveTeacherInfoTabRedirect('/profile', 'agenda')).toBe('/profile');
		expect(resolveTeacherInfoTabRedirect('/profile', 'availability')).toBeNull();
	});
});
