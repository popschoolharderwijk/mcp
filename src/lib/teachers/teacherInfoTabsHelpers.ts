import type { ProfileAddressFields } from '@/types/profile-address';
import type { Teacher } from '@/types/teachers';

export type TeacherInfoTabId = 'profile' | 'address' | 'agenda';

const TEACHER_INFO_TABS = new Set<TeacherInfoTabId>(['profile', 'address', 'agenda']);

const DEFAULT_TEACHER_INFO_TAB: TeacherInfoTabId = 'profile';

export function isTeacherInfoTabId(value: string): value is TeacherInfoTabId {
	return TEACHER_INFO_TABS.has(value as TeacherInfoTabId);
}

export function parseTeacherInfoTab(tab: string | undefined): TeacherInfoTabId {
	return tab && isTeacherInfoTabId(tab) ? tab : DEFAULT_TEACHER_INFO_TAB;
}

/** Base path for a teacher detail page (`/teachers/:id` or `/teachers/my-profile`). */
export function resolveTeacherInfoBasePath(routeId: string | undefined): string {
	return routeId ? `/teachers/${routeId}` : '/teachers/my-profile';
}

export function resolveTeacherInfoTabRoute(basePath: string, tab: TeacherInfoTabId): string {
	return `${basePath}/${tab}`;
}

/** When the URL tab is missing or invalid, return the canonical path to redirect to. */
export function resolveTeacherInfoTabRedirect(basePath: string, tabParam: string | undefined): string | null {
	const resolved = parseTeacherInfoTab(tabParam);
	if (tabParam === resolved) return null;
	return resolveTeacherInfoTabRoute(basePath, resolved);
}

export function buildTeacherInfoPath(teacherUserId: string, tab: TeacherInfoTabId = DEFAULT_TEACHER_INFO_TAB): string {
	return resolveTeacherInfoTabRoute(`/teachers/${teacherUserId}`, tab);
}

/** Address fields for the teacher Adres tab from a loaded teacher profile row. */
export function teacherAddressFieldsFromProfile(teacher: Teacher): ProfileAddressFields {
	return {
		street_name: teacher.street_name ?? null,
		house_number: teacher.house_number ?? null,
		postal_code: teacher.postal_code ?? null,
		city: teacher.city ?? null,
		country_code: teacher.country_code ?? 'NL',
	};
}
