export type StudentInfoTabId = 'profile' | 'address' | 'parent' | 'agreements' | 'signups' | 'agenda';

const STUDENT_INFO_TABS = new Set<StudentInfoTabId>([
	'profile',
	'address',
	'parent',
	'agreements',
	'signups',
	'agenda',
]);

const PRIVILEGED_ONLY_STUDENT_TABS = new Set<StudentInfoTabId>(['profile', 'address', 'parent']);

export function isStudentInfoTabId(value: string): value is StudentInfoTabId {
	return STUDENT_INFO_TABS.has(value as StudentInfoTabId);
}

export function resolveStudentInfoTabsDefaultValue(isPrivileged: boolean): StudentInfoTabId {
	return isPrivileged ? 'profile' : 'agreements';
}

export function parseStudentInfoTab(tab: string | undefined, isPrivileged: boolean): StudentInfoTabId {
	const defaultTab = resolveStudentInfoTabsDefaultValue(isPrivileged);
	if (!tab || !isStudentInfoTabId(tab)) return defaultTab;
	if (!isPrivileged && PRIVILEGED_ONLY_STUDENT_TABS.has(tab)) return defaultTab;
	return tab;
}

export function resolveStudentInfoTabRoute(userId: string, tab: StudentInfoTabId): string {
	return `/students/${userId}/${tab}`;
}

/** When the URL tab is missing, invalid, or not allowed, return the canonical path to redirect to. */
export function resolveStudentInfoTabRedirect(
	userId: string,
	tabParam: string | undefined,
	isPrivileged: boolean,
): string | null {
	const resolved = parseStudentInfoTab(tabParam, isPrivileged);
	if (tabParam === resolved) return null;
	return resolveStudentInfoTabRoute(userId, resolved);
}

export function buildStudentDetailPath(userId: string, tab: StudentInfoTabId = 'profile'): string {
	return resolveStudentInfoTabRoute(userId, tab);
}

/** Resolve URL tab state after auth is ready; nulls while auth is still loading. */
export function resolveStudentDetailTabState(args: {
	userId: string | undefined;
	tabParam: string | undefined;
	authLoading: boolean;
	isPrivileged: boolean;
}): { activeTab: StudentInfoTabId | null; tabRedirectTo: string | null } {
	if (!args.userId || args.authLoading) {
		return { activeTab: null, tabRedirectTo: null };
	}
	return {
		activeTab: parseStudentInfoTab(args.tabParam, args.isPrivileged),
		tabRedirectTo: resolveStudentInfoTabRedirect(args.userId, args.tabParam, args.isPrivileged),
	};
}

/** Teachers may view a student agenda; only privileged users may edit it. */
export function resolveStudentDetailAccess(
	isPrivileged: boolean,
	isTeacher: boolean,
): {
	canView: boolean;
	canEditAgenda: boolean;
} {
	return {
		canView: isPrivileged || isTeacher,
		canEditAgenda: isPrivileged,
	};
}
