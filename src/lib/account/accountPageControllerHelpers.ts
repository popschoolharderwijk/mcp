export type AccountTab = 'appearance' | 'security' | 'danger';

export function resolveAccountTabRoute(tab: AccountTab): string {
	const routes: Record<AccountTab, string> = {
		appearance: '/account/appearance',
		security: '/account/security',
		danger: '/account/danger',
	};
	return routes[tab];
}

export function isAccountTab(value: string): value is AccountTab {
	return value === 'appearance' || value === 'security' || value === 'danger';
}
