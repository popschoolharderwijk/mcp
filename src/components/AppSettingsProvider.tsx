import { createContext, type ReactNode, useContext, useEffect } from 'react';
import { useAppSettings } from '@/hooks/useAppSettings';
import { applyBrandPrimaryToDocument } from '@/lib/color/brandThemeHelpers';

type AppSettingsContextValue = ReturnType<typeof useAppSettings>;

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
	const value = useAppSettings();

	useEffect(() => {
		applyBrandPrimaryToDocument(value.settings.branding.primary_hex);
	}, [value.settings.branding.primary_hex]);

	return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettingsContext(): AppSettingsContextValue {
	const context = useContext(AppSettingsContext);
	if (!context) {
		throw new Error('useAppSettingsContext must be used within AppSettingsProvider');
	}
	return context;
}
