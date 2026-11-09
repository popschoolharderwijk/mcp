import { describe, expect, it } from 'bun:test';
import { buildTopNavHookState } from '../../../src/lib/layout/topNavHookStateHelpers';

describe('buildTopNavHookState', () => {
	it('merges base state with navigation callbacks', () => {
		const onNavigateSettings = () => {};
		const state = buildTopNavHookState(
			{
				open: false,
				setOpen: () => {},
				breadcrumbItems: [{ label: 'Dashboard', href: '/' }],
				displayName: 'Anna Bakker',
				email: 'anna@example.com',
				roleLabel: 'staff',
				userInitialsInput: { first_name: 'Anna', last_name: 'Bakker', email: 'anna@example.com' },
				avatarUrl: null,
				resolvedTheme: 'light',
				showAppVersion: true,
			},
			{
				onNavigateSettings,
				onSignOut: async () => {},
				onToggleTheme: () => {},
				onNavigate: (() => {}) as never,
			},
		);

		expect(state.displayName).toBe('Anna Bakker');
		expect(state.onNavigateSettings).toBe(onNavigateSettings);
		expect(state.breadcrumbItems).toEqual([{ label: 'Dashboard', href: '/' }]);
	});
});
