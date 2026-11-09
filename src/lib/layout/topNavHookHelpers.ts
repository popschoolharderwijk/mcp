import type { NavigateFunction } from 'react-router-dom';
import { createThemeToggleHandler } from '@/components/layout/TopNavUserMenu';

export interface TopNavNavigationCallbacks {
	onNavigateSettings: () => void;
	onSignOut: () => Promise<void>;
	onToggleTheme: () => void;
	onNavigate: NavigateFunction;
}

export function buildTopNavNavigationCallbacks(
	navigate: NavigateFunction,
	signOut: () => Promise<void>,
	resolvedTheme: string,
	setTheme: (theme: 'light' | 'dark') => void,
): TopNavNavigationCallbacks {
	return {
		onNavigateSettings: () => navigate('/account/profile'),
		onSignOut: async () => {
			await signOut();
			navigate('/login');
		},
		onToggleTheme: createThemeToggleHandler(resolvedTheme, setTheme),
		onNavigate: navigate,
	};
}
