export interface TopNavProfile {
	first_name: string | null;
	last_name: string | null;
	avatar_url: string | null;
}

export function canViewAppVersion(isAdmin: boolean, isSiteAdmin: boolean): boolean {
	return isAdmin || isSiteAdmin;
}

export function formatTopNavDisplayName(profile: TopNavProfile | null, email: string | null | undefined): string {
	if (profile?.first_name && profile?.last_name) {
		return `${profile.first_name} ${profile.last_name}`;
	}
	if (profile?.first_name) {
		return profile.first_name;
	}
	return email?.split('@')[0] ?? '';
}

export function formatTopNavRoleLabel(role: string | null): string | null {
	if (!role) return null;
	return role.replace('_', ' ');
}

export function getNextTheme(resolvedTheme: string): 'light' | 'dark' {
	return resolvedTheme === 'dark' ? 'light' : 'dark';
}

export function shouldShowTopNavVersion(showAppVersion: boolean, appVersion: string | undefined | null): boolean {
	return showAppVersion && Boolean(appVersion);
}

export type ThemeToggleIcon = 'moon' | 'sun';

export function resolveThemeToggleIcon(resolvedTheme: string): ThemeToggleIcon {
	return resolvedTheme === 'dark' ? 'moon' : 'sun';
}

export interface TopNavUserInitialsInput {
	first_name: string | null;
	last_name: string | null;
	email: string | null | undefined;
}

export function buildTopNavUserInitialsInput(
	profile: TopNavProfile | null,
	email: string | null | undefined,
): TopNavUserInitialsInput {
	return {
		first_name: profile?.first_name ?? null,
		last_name: profile?.last_name ?? null,
		email: email ?? null,
	};
}
