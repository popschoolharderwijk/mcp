import { isOwnProfileBasePath, OWN_PROFILE_BASE_PATH } from '@/lib/profile/personDetailTabsHelpers';

export type StudentInfoTabId = 'profile' | 'address' | 'parent' | 'agreements' | 'signups' | 'agenda';

const STUDENT_INFO_TABS = new Set<StudentInfoTabId>([
	'profile',
	'address',
	'parent',
	'agreements',
	'signups',
	'agenda',
]);

const PERSONAL_DATA_STUDENT_TABS = new Set<StudentInfoTabId>(['profile', 'address', 'parent']);

export function isStudentInfoTabId(value: string): value is StudentInfoTabId {
	return STUDENT_INFO_TABS.has(value as StudentInfoTabId);
}

function resolveStudentInfoTabsDefaultValue(canViewPersonalData: boolean): StudentInfoTabId {
	return canViewPersonalData ? 'profile' : 'agreements';
}

export function parseStudentInfoTab(
	tab: string | undefined,
	canViewPersonalData: boolean,
	options?: { includeAgenda?: boolean },
): StudentInfoTabId {
	const includeAgenda = options?.includeAgenda ?? true;
	const defaultTab = resolveStudentInfoTabsDefaultValue(canViewPersonalData);
	if (!tab || !isStudentInfoTabId(tab)) return defaultTab;
	if (!canViewPersonalData && PERSONAL_DATA_STUDENT_TABS.has(tab)) return defaultTab;
	if (!includeAgenda && tab === 'agenda') return defaultTab;
	return tab;
}

export function resolveStudentInfoBasePath(userId: string, selfProfile: boolean): string {
	return selfProfile ? OWN_PROFILE_BASE_PATH : `/students/${userId}`;
}

function resolveStudentInfoIncludeAgenda(basePath: string): boolean {
	return !isOwnProfileBasePath(basePath);
}

export function resolveStudentInfoTabRoute(basePath: string, tab: StudentInfoTabId): string {
	if (isOwnProfileBasePath(basePath) && tab === 'profile') {
		return OWN_PROFILE_BASE_PATH;
	}
	return `${basePath}/${tab}`;
}

/** When the URL tab is missing, invalid, or not allowed, return the canonical path to redirect to. */
export function resolveStudentInfoTabRedirect(
	basePath: string,
	tabParam: string | undefined,
	canViewPersonalData: boolean,
): string | null {
	const includeAgenda = resolveStudentInfoIncludeAgenda(basePath);
	const resolved = parseStudentInfoTab(tabParam, canViewPersonalData, { includeAgenda });
	const canonical = resolveStudentInfoTabRoute(basePath, resolved);
	const current = tabParam === undefined ? basePath : `${basePath}/${tabParam}`;
	if (current === canonical) return null;
	return canonical;
}

export function buildStudentDetailPath(userId: string, tab: StudentInfoTabId = 'profile'): string {
	return resolveStudentInfoTabRoute(`/students/${userId}`, tab);
}

/** Resolve URL tab state after auth is ready; nulls while auth is still loading. */
export function resolveStudentDetailTabState(args: {
	userId: string | undefined;
	basePath: string | undefined;
	tabParam: string | undefined;
	authLoading: boolean;
	canViewPersonalData: boolean;
}): { activeTab: StudentInfoTabId | null; tabRedirectTo: string | null } {
	if (!args.userId || !args.basePath || args.authLoading) {
		return { activeTab: null, tabRedirectTo: null };
	}
	const includeAgenda = resolveStudentInfoIncludeAgenda(args.basePath);
	return {
		activeTab: parseStudentInfoTab(args.tabParam, args.canViewPersonalData, { includeAgenda }),
		tabRedirectTo: resolveStudentInfoTabRedirect(args.basePath, args.tabParam, args.canViewPersonalData),
	};
}

export function resolveStudentDetailAccess(params: {
	isPrivileged: boolean;
	isTeacher: boolean;
	viewerUserId: string | null | undefined;
	targetUserId: string | null | undefined;
}): {
	canView: boolean;
	canEditAgenda: boolean;
	canViewPersonalData: boolean;
	canManagePersonalData: boolean;
	isSelf: boolean;
} {
	const isSelf = Boolean(params.viewerUserId && params.targetUserId && params.viewerUserId === params.targetUserId);
	const canView = params.isPrivileged || params.isTeacher || isSelf;
	return {
		canView,
		canEditAgenda: params.isPrivileged,
		canViewPersonalData: canView,
		canManagePersonalData: params.isPrivileged || isSelf,
		isSelf,
	};
}

export function resolveStudentDetailRouteState(params: {
	routeUserId: string | undefined;
	viewerUserId: string | undefined;
	isPrivileged: boolean;
	isTeacher: boolean;
	tabParam: string | undefined;
	authLoading: boolean;
}): {
	userId: string | undefined;
	basePath: string | undefined;
	includeAgenda: boolean;
	access: ReturnType<typeof resolveStudentDetailAccess>;
	activeTab: StudentInfoTabId | null;
	tabRedirectTo: string | null;
} {
	const selfProfile = !params.routeUserId;
	const userId = params.routeUserId ?? params.viewerUserId;
	const basePath = userId ? resolveStudentInfoBasePath(userId, selfProfile) : undefined;
	const includeAgenda = basePath ? resolveStudentInfoIncludeAgenda(basePath) : true;
	const access = resolveStudentDetailAccess({
		isPrivileged: params.isPrivileged,
		isTeacher: params.isTeacher,
		viewerUserId: params.viewerUserId,
		targetUserId: userId,
	});
	const tabState = resolveStudentDetailTabState({
		userId,
		basePath,
		tabParam: params.tabParam,
		authLoading: params.authLoading,
		canViewPersonalData: access.canViewPersonalData,
	});
	return {
		userId,
		basePath,
		includeAgenda,
		access,
		activeTab: tabState.activeTab,
		tabRedirectTo: tabState.tabRedirectTo,
	};
}
