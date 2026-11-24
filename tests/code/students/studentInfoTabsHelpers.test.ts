import { describe, expect, it } from 'bun:test';
import {
	buildStudentDetailPath,
	parseStudentInfoTab,
	resolveStudentDetailAccess,
	resolveStudentDetailRouteState,
	resolveStudentDetailTabState,
	resolveStudentInfoBasePath,
	resolveStudentInfoTabRedirect,
	resolveStudentInfoTabRoute,
} from '../../../src/lib/students/studentInfoTabsHelpers';

describe('parseStudentInfoTab', () => {
	it('defaults by personal-data view access when the tab is missing or invalid', () => {
		expect(parseStudentInfoTab(undefined, true)).toBe('profile');
		expect(parseStudentInfoTab('unknown', true)).toBe('profile');
		expect(parseStudentInfoTab(undefined, false)).toBe('agreements');
	});

	it('blocks personal-data tabs without view access', () => {
		expect(parseStudentInfoTab('profile', false)).toBe('agreements');
		expect(parseStudentInfoTab('address', false)).toBe('agreements');
		expect(parseStudentInfoTab('parent', false)).toBe('agreements');
		expect(parseStudentInfoTab('agenda', false)).toBe('agenda');
	});

	it('keeps valid tabs when personal-data view access is allowed', () => {
		expect(parseStudentInfoTab('parent', true)).toBe('parent');
		expect(parseStudentInfoTab('signups', true)).toBe('signups');
	});
});

describe('student info tab routes', () => {
	it('builds detail paths with english tab segments', () => {
		expect(resolveStudentInfoBasePath('student-1', false)).toBe('/students/student-1');
		expect(resolveStudentInfoBasePath('student-1', true)).toBe('/profile');
		expect(resolveStudentInfoTabRoute('/students/student-1', 'address')).toBe('/students/student-1/address');
		expect(resolveStudentInfoTabRoute('/profile', 'profile')).toBe('/profile');
		expect(resolveStudentInfoTabRoute('/profile', 'address')).toBe('/profile/address');
		expect(buildStudentDetailPath('student-1')).toBe('/students/student-1/profile');
		expect(buildStudentDetailPath('student-1', 'agreements')).toBe('/students/student-1/agreements');
	});

	it('redirects missing or disallowed tabs', () => {
		expect(resolveStudentInfoTabRedirect('/students/student-1', undefined, true)).toBe(
			'/students/student-1/profile',
		);
		expect(resolveStudentInfoTabRedirect('/students/student-1', undefined, false)).toBe(
			'/students/student-1/agreements',
		);
		expect(resolveStudentInfoTabRedirect('/students/student-1', 'profile', false)).toBe(
			'/students/student-1/agreements',
		);
		expect(resolveStudentInfoTabRedirect('/students/student-1', 'agenda', true)).toBeNull();
		expect(resolveStudentInfoTabRedirect('/profile', undefined, true)).toBeNull();
		expect(resolveStudentInfoTabRedirect('/profile', 'profile', true)).toBe('/profile');
		expect(resolveStudentInfoTabRedirect('/profile', 'agenda', true)).toBe('/profile');
	});
});

describe('resolveStudentDetailTabState', () => {
	it('returns nulls while auth is loading', () => {
		expect(
			resolveStudentDetailTabState({
				userId: 'student-1',
				basePath: '/students/student-1',
				tabParam: 'profile',
				authLoading: true,
				canViewPersonalData: true,
			}),
		).toEqual({ activeTab: null, tabRedirectTo: null });
	});

	it('returns nulls when userId is missing', () => {
		expect(
			resolveStudentDetailTabState({
				userId: undefined,
				basePath: undefined,
				tabParam: 'profile',
				authLoading: false,
				canViewPersonalData: true,
			}),
		).toEqual({ activeTab: null, tabRedirectTo: null });
	});

	it('exposes active tab and redirect after auth is ready', () => {
		expect(
			resolveStudentDetailTabState({
				userId: 'student-1',
				basePath: '/students/student-1',
				tabParam: undefined,
				authLoading: false,
				canViewPersonalData: true,
			}),
		).toEqual({ activeTab: 'profile', tabRedirectTo: '/students/student-1/profile' });
		expect(
			resolveStudentDetailTabState({
				userId: 'student-1',
				basePath: '/students/student-1',
				tabParam: 'agenda',
				authLoading: false,
				canViewPersonalData: false,
			}),
		).toEqual({ activeTab: 'agenda', tabRedirectTo: null });
	});
});

describe('resolveStudentDetailRouteState', () => {
	it('uses bare /profile and omits agenda for self profile', () => {
		expect(
			resolveStudentDetailRouteState({
				routeUserId: undefined,
				viewerUserId: 'student-1',
				isPrivileged: false,
				isTeacher: false,
				tabParam: 'agenda',
				authLoading: false,
			}),
		).toEqual({
			userId: 'student-1',
			basePath: '/profile',
			includeAgenda: false,
			access: {
				canView: true,
				canEditAgenda: false,
				canViewPersonalData: true,
				canManagePersonalData: true,
				isSelf: true,
			},
			activeTab: 'profile',
			tabRedirectTo: '/profile',
		});
	});

	it('keeps personal-data tabs for teachers with view-only access', () => {
		const state = resolveStudentDetailRouteState({
			routeUserId: 'student-1',
			viewerUserId: 'teacher-1',
			isPrivileged: false,
			isTeacher: true,
			tabParam: 'address',
			authLoading: false,
		});
		expect(state.activeTab).toBe('address');
		expect(state.tabRedirectTo).toBeNull();
		expect(state.access.canManagePersonalData).toBe(false);
	});
});

describe('resolveStudentDetailAccess', () => {
	it('allows privileged users to view, edit agenda, and manage personal data', () => {
		expect(
			resolveStudentDetailAccess({
				isPrivileged: true,
				isTeacher: false,
				viewerUserId: 'admin-1',
				targetUserId: 'student-1',
			}),
		).toEqual({
			canView: true,
			canEditAgenda: true,
			canViewPersonalData: true,
			canManagePersonalData: true,
			isSelf: false,
		});
	});

	it('allows teachers to view personal data but not manage it or edit agenda', () => {
		expect(
			resolveStudentDetailAccess({
				isPrivileged: false,
				isTeacher: true,
				viewerUserId: 'teacher-1',
				targetUserId: 'student-1',
			}),
		).toEqual({
			canView: true,
			canEditAgenda: false,
			canViewPersonalData: true,
			canManagePersonalData: false,
			isSelf: false,
		});
	});

	it('allows students to view and manage their own personal data', () => {
		expect(
			resolveStudentDetailAccess({
				isPrivileged: false,
				isTeacher: false,
				viewerUserId: 'student-1',
				targetUserId: 'student-1',
			}),
		).toEqual({
			canView: true,
			canEditAgenda: false,
			canViewPersonalData: true,
			canManagePersonalData: true,
			isSelf: true,
		});
	});

	it('denies unrelated users without privileged or teacher access', () => {
		expect(
			resolveStudentDetailAccess({
				isPrivileged: false,
				isTeacher: false,
				viewerUserId: 'other-1',
				targetUserId: 'student-1',
			}),
		).toEqual({
			canView: false,
			canEditAgenda: false,
			canViewPersonalData: false,
			canManagePersonalData: false,
			isSelf: false,
		});
	});
});
