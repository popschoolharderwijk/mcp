import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeProviderContextType {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	resolvedTheme: 'light' | 'dark';
}

const ThemeProviderContext = createContext<ThemeProviderContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'mplifi-theme';
const THEME_VALUES: ReadonlySet<string> = new Set(['light', 'dark', 'system']);

function getSystemTheme(): 'light' | 'dark' {
	if (typeof window === 'undefined') return 'dark';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyDocumentTheme(theme: Theme): 'light' | 'dark' {
	const root = document.documentElement;
	root.classList.remove('light', 'dark');
	const resolved = theme === 'system' ? getSystemTheme() : theme;
	root.classList.add(resolved);

	const meta = document.querySelector('meta[name="color-scheme"]');
	if (meta) {
		meta.setAttribute('content', theme === 'system' ? 'light dark' : theme);
	}

	return resolved;
}

function readThemeFromStorage(defaultTheme: Theme): Theme {
	if (typeof window === 'undefined') return defaultTheme;
	const stored = localStorage.getItem(THEME_STORAGE_KEY);
	if (!stored || !THEME_VALUES.has(stored)) return defaultTheme;
	return stored as Theme;
}

export function ThemeProvider({ children, defaultTheme = 'system' }: { children: ReactNode; defaultTheme?: Theme }) {
	const [theme, setThemeState] = useState<Theme>(() => readThemeFromStorage(defaultTheme));

	const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
		theme === 'system' ? getSystemTheme() : theme,
	);

	useEffect(() => {
		setResolvedTheme(applyDocumentTheme(theme));
	}, [theme]);

	useEffect(() => {
		if (theme !== 'system') return;

		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = () => {
			setResolvedTheme(applyDocumentTheme('system'));
		};

		mediaQuery.addEventListener('change', handleChange);
		return () => mediaQuery.removeEventListener('change', handleChange);
	}, [theme]);

	const setTheme = (newTheme: Theme) => {
		if (newTheme === 'system') {
			localStorage.removeItem(THEME_STORAGE_KEY);
		} else {
			localStorage.setItem(THEME_STORAGE_KEY, newTheme);
		}
		setThemeState(newTheme);
	};

	return (
		<ThemeProviderContext.Provider value={{ theme, setTheme, resolvedTheme }}>
			{children}
		</ThemeProviderContext.Provider>
	);
}

export function useTheme() {
	const context = useContext(ThemeProviderContext);
	if (!context) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}
	return context;
}
