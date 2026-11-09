import { describe, expect, it } from 'bun:test';
import { buildTopNavNavigationCallbacks } from '../../../src/lib/layout/topNavHookHelpers';

describe('buildTopNavNavigationCallbacks', () => {
	it('builds navigation callbacks with settings and sign-out routes', async () => {
		const navigated: string[] = [];
		const navigate = ((path: string) => {
			navigated.push(path);
		}) as never;
		let signedOut = false;
		const state = { theme: 'light' as 'light' | 'dark' };

		const callbacks = buildTopNavNavigationCallbacks(
			navigate,
			async () => {
				signedOut = true;
			},
			'light',
			(nextTheme: 'light' | 'dark') => {
				state.theme = nextTheme;
			},
		);

		callbacks.onNavigateSettings();
		await callbacks.onSignOut();
		callbacks.onToggleTheme();

		expect(navigated).toEqual(['/account/profile', '/login']);
		expect(signedOut).toBe(true);
		expect(state.theme).toBe('dark');
	});

	it('toggles theme from dark to light', () => {
		const state = { theme: 'dark' as 'light' | 'dark' };
		const callbacks = buildTopNavNavigationCallbacks(
			(() => {}) as never,
			async () => {},
			'dark',
			(nextTheme: 'light' | 'dark') => {
				state.theme = nextTheme;
			},
		);

		callbacks.onToggleTheme();
		expect(state.theme).toBe('light');
	});
});
