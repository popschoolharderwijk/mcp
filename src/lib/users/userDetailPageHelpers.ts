import {
	isOwnProfileBasePath,
	OWN_PROFILE_BASE_PATH,
	type PersonDetailTabId,
	parsePersonDetailTab,
	resolvePersonDetailTabRedirect,
} from '@/lib/profile/personDetailTabsHelpers';
import type { AppRole } from '@/lib/roles';
import type { UserWithRole } from '@/lib/users/usersPageHelpers';
import { shouldShowUsersPage } from '@/lib/users/usersPageShellHelpers';

export type UserDetailUser = UserWithRole & {
	date_of_birth: string | null;
	street_name: string | null;
	house_number: string | null;
	postal_code: string | null;
	city: string | null;
	country_code: string | null;
};

export type UserDetailScreen =
	| { kind: 'navigate'; to: string }
	| { kind: 'loading' }
	| { kind: 'ready'; user: UserDetailUser };

export type UserDetailLoadOutcome =
	| { kind: 'success'; user: UserDetailUser }
	| { kind: 'not-found' }
	| { kind: 'error' };

export interface UserDetailProfileRow {
	user_id: string;
	email: string;
	first_name: string | null;
	last_name: string | null;
	phone_number: string | null;
	avatar_url: string | null;
	date_of_birth: string | null;
	created_at: string;
	street_name: string | null;
	house_number: string | null;
	postal_code: string | null;
	city: string | null;
	country_code: string | null;
}

export interface UserDetailQueryResult<T> {
	data: T | null;
	error: { message: string } | null;
}

export function resolveUserDetailScreen(input: {
	tabRedirectTo: string | null;
	authLoading: boolean;
	hasAccess: boolean;
	loading: boolean;
	user: UserDetailUser | null;
	notFound: boolean;
}): UserDetailScreen {
	if (input.tabRedirectTo) {
		return { kind: 'navigate', to: input.tabRedirectTo };
	}
	if (input.authLoading || (input.hasAccess && input.loading && !input.user && !input.notFound)) {
		return { kind: 'loading' };
	}
	if (!input.hasAccess) {
		return { kind: 'navigate', to: '/' };
	}
	if (input.notFound || !input.user) {
		return { kind: 'navigate', to: '/users' };
	}
	return { kind: 'ready', user: input.user };
}

export function userDetailHref(userId: string): string {
	return `/users/${userId}/profile`;
}

function resolveUserDetailBasePath(userId: string, selfProfile = false): string {
	return selfProfile ? OWN_PROFILE_BASE_PATH : `/users/${userId}`;
}

export function resolveUserDetailRouteState(params: {
	routeUserId: string | undefined;
	authUserId: string | undefined;
	isAdmin: boolean;
	isSiteAdmin: boolean;
	tabParam: string | undefined;
}): {
	userId: string | undefined;
	hasAccess: boolean;
	basePath: string;
	includeAgenda: boolean;
	activeTab: PersonDetailTabId;
	tabRedirectTo: string | null;
} {
	const selfProfile = !params.routeUserId;
	const userId = params.routeUserId ?? params.authUserId;
	const isSelf = Boolean(userId && params.authUserId === userId);
	const hasAccess = shouldShowUsersPage(params.isAdmin, params.isSiteAdmin) || isSelf;
	const basePath = userId ? resolveUserDetailBasePath(userId, selfProfile) : '';
	const includeAgenda = !isOwnProfileBasePath(basePath);
	return {
		userId,
		hasAccess,
		basePath,
		includeAgenda,
		activeTab: parsePersonDetailTab(params.tabParam, { includeAgenda }),
		tabRedirectTo: userId ? resolvePersonDetailTabRedirect(basePath, params.tabParam, { includeAgenda }) : null,
	};
}

export function mapUserDetailQueriesToOutcome(
	profileResult: UserDetailQueryResult<UserDetailProfileRow>,
	roleResult: UserDetailQueryResult<{ role: AppRole }>,
): { outcome: UserDetailLoadOutcome; toastDescription: string | null } {
	const profileErrorMessage = profileResult.error === null ? null : profileResult.error.message;
	const roleErrorMessage = roleResult.error === null ? null : roleResult.error.message;
	const role = roleResult.data === null ? null : roleResult.data.role;

	if (profileErrorMessage !== null || roleErrorMessage !== null) {
		return {
			outcome: { kind: 'error' },
			toastDescription: profileErrorMessage === null ? roleErrorMessage : profileErrorMessage,
		};
	}

	if (profileResult.data === null) {
		return { outcome: { kind: 'not-found' }, toastDescription: null };
	}

	const profile = profileResult.data;
	return {
		outcome: {
			kind: 'success',
			user: {
				user_id: profile.user_id,
				email: profile.email,
				first_name: profile.first_name,
				last_name: profile.last_name,
				phone_number: profile.phone_number,
				avatar_url: profile.avatar_url,
				date_of_birth: profile.date_of_birth,
				created_at: profile.created_at,
				last_sign_in_at: null,
				role,
				street_name: profile.street_name,
				house_number: profile.house_number,
				postal_code: profile.postal_code,
				city: profile.city,
				country_code: profile.country_code,
			},
		},
		toastDescription: null,
	};
}

export function applyUserDetailLoadOutcome(
	result: UserDetailLoadOutcome,
	setUser: (user: UserDetailUser | null) => void,
	setNotFound: (notFound: boolean) => void,
): void {
	if (result.kind === 'success') {
		setUser(result.user);
		setNotFound(false);
		return;
	}
	setUser(null);
	setNotFound(result.kind === 'not-found');
}
