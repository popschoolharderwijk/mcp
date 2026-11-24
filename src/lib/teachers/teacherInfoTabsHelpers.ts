import {
	buildPersonDetailPath,
	isOwnProfileBasePath,
	OWN_PROFILE_BASE_PATH,
	type PersonDetailTabId,
	parsePersonDetailTab,
	resolvePersonDetailTabRedirect,
	resolvePersonDetailTabRoute,
} from '@/lib/profile/personDetailTabsHelpers';

/** Base path for a teacher detail page (`/teachers/:id` or own profile at `/profile`). */
export function resolveTeacherInfoBasePath(routeId: string | undefined): string {
	return routeId ? `/teachers/${routeId}` : OWN_PROFILE_BASE_PATH;
}

export function resolveTeacherInfoIncludeAgenda(basePath: string): boolean {
	return !isOwnProfileBasePath(basePath);
}

export function resolveTeacherInfoTabRoute(basePath: string, tab: PersonDetailTabId): string {
	return resolvePersonDetailTabRoute(basePath, tab);
}

/** When the URL tab is missing or invalid, return the canonical path to redirect to. */
export function resolveTeacherInfoTabRedirect(basePath: string, tabParam: string | undefined): string | null {
	return resolvePersonDetailTabRedirect(basePath, tabParam, {
		includeAgenda: resolveTeacherInfoIncludeAgenda(basePath),
	});
}

export function buildTeacherInfoPath(
	teacherUserId: string,
	tab: PersonDetailTabId = parsePersonDetailTab(undefined),
): string {
	return buildPersonDetailPath(`/teachers/${teacherUserId}`, tab);
}
