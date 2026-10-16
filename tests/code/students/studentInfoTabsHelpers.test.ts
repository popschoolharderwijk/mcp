import { describe, expect, it } from 'bun:test';
import {
	buildStudentDetailPath,
	parseStudentInfoTab,
	resolveStudentDetailAccess,
	resolveStudentDetailTabState,
	resolveStudentInfoTabRedirect,
	resolveStudentInfoTabRoute,
	resolveStudentInfoTabsDefaultValue,
} from '../../../src/lib/students/studentInfoTabsHelpers';

describe('resolveStudentInfoTabsDefaultValue', () => {
	it('opens profile for privileged users', () => {
		expect(resolveStudentInfoTabsDefaultValue(true)).toBe('profile');
	});

	it('opens agreements for non-privileged users', () => {
		expect(resolveStudentInfoTabsDefaultValue(false)).toBe('agreements');
	});
});

describe('parseStudentInfoTab', () => {
	it('defaults by privilege when the tab is missing or invalid', () => {
		expect(parseStudentInfoTab(undefined, true)).toBe('profile');
		expect(parseStudentInfoTab('unknown', true)).toBe('profile');
		expect(parseStudentInfoTab(undefined, false)).toBe('agreements');
	});

	it('blocks privileged-only tabs for non-privileged users', () => {
		expect(parseStudentInfoTab('profile', false)).toBe('agreements');
		expect(parseStudentInfoTab('address', false)).toBe('agreements');
		expect(parseStudentInfoTab('parent', false)).toBe('agreements');
		expect(parseStudentInfoTab('agenda', false)).toBe('agenda');
	});

	it('keeps valid tabs for privileged users', () => {
		expect(parseStudentInfoTab('parent', true)).toBe('parent');
		expect(parseStudentInfoTab('signups', true)).toBe('signups');
	});
});

describe('student info tab routes', () => {
	it('builds detail paths with english tab segments', () => {
		expect(resolveStudentInfoTabRoute('student-1', 'address')).toBe('/students/student-1/address');
		expect(buildStudentDetailPath('student-1')).toBe('/students/student-1/profile');
		expect(buildStudentDetailPath('student-1', 'agreements')).toBe('/students/student-1/agreements');
	});

	it('redirects missing or disallowed tabs', () => {
		expect(resolveStudentInfoTabRedirect('student-1', undefined, true)).toBe('/students/student-1/profile');
		expect(resolveStudentInfoTabRedirect('student-1', undefined, false)).toBe('/students/student-1/agreements');
		expect(resolveStudentInfoTabRedirect('student-1', 'profile', false)).toBe('/students/student-1/agreements');
		expect(resolveStudentInfoTabRedirect('student-1', 'agenda', true)).toBeNull();
	});
});

describe('resolveStudentDetailTabState', () => {
	it('returns nulls while auth is loading', () => {
		expect(
			resolveStudentDetailTabState({
				userId: 'student-1',
				tabParam: 'profile',
				authLoading: true,
				isPrivileged: true,
			}),
		).toEqual({ activeTab: null, tabRedirectTo: null });
	});

	it('returns nulls when userId is missing', () => {
		expect(
			resolveStudentDetailTabState({
				userId: undefined,
				tabParam: 'profile',
				authLoading: false,
				isPrivileged: true,
			}),
		).toEqual({ activeTab: null, tabRedirectTo: null });
	});

	it('exposes active tab and redirect after auth is ready', () => {
		expect(
			resolveStudentDetailTabState({
				userId: 'student-1',
				tabParam: undefined,
				authLoading: false,
				isPrivileged: true,
			}),
		).toEqual({ activeTab: 'profile', tabRedirectTo: '/students/student-1/profile' });
		expect(
			resolveStudentDetailTabState({
				userId: 'student-1',
				tabParam: 'agenda',
				authLoading: false,
				isPrivileged: false,
			}),
		).toEqual({ activeTab: 'agenda', tabRedirectTo: null });
	});
});

describe('resolveStudentDetailAccess', () => {
	it('allows privileged users to view and edit agenda', () => {
		expect(resolveStudentDetailAccess(true, false)).toEqual({ canView: true, canEditAgenda: true });
	});

	it('allows teachers to view but not edit agenda', () => {
		expect(resolveStudentDetailAccess(false, true)).toEqual({ canView: true, canEditAgenda: false });
	});

	it('denies users without privileged or teacher access', () => {
		expect(resolveStudentDetailAccess(false, false)).toEqual({ canView: false, canEditAgenda: false });
	});
});
