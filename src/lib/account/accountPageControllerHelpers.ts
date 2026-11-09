import { getUserInitials } from '@/components/ui/user-display';
import { mapLoadedProfileToFormState } from '@/lib/account/accountPageHelpers';
import type { AccountFormData, AccountProfileState } from '@/lib/account/persistence';

export type AccountTab = 'profile' | 'appearance' | 'security' | 'danger';

export function createInitialAccountFormData(): AccountFormData {
	return {
		first_name: '',
		last_name: '',
		phone_number: '',
	};
}

export function resolveAccountTabRoute(tab: AccountTab): string {
	const routes: Record<AccountTab, string> = {
		profile: '/account/profile',
		appearance: '/account/appearance',
		security: '/account/security',
		danger: '/account/danger',
	};
	return routes[tab];
}

export function isAccountTab(value: string): value is AccountTab {
	return value === 'profile' || value === 'appearance' || value === 'security' || value === 'danger';
}

export function applyAccountProfileLoadResult(data: AccountProfileState | null): {
	profile: AccountProfileState | null;
	formData: AccountFormData | null;
} {
	if (!data) {
		return { profile: null, formData: null };
	}
	return {
		profile: data,
		formData: mapLoadedProfileToFormState(data),
	};
}

export function buildAccountPageUserInitials(
	user: { email?: string | null } | null,
	profile: AccountProfileState | null,
): string {
	return getUserInitials({
		first_name: profile?.first_name ?? null,
		last_name: profile?.last_name ?? null,
		email: user?.email ?? null,
	});
}
