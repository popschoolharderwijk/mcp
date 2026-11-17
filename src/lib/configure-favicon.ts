import { resolveAppMode } from '@/lib/modeHelpers';

const FAVICON_SRC = '/favicon.svg';
const FAVICON_DEVELOPMENT_SRC = '/favicon-local.svg';
const FAVICON_LOCALDEV_SRC = '/favicon-localdev.svg';

export function resolveFaviconSrc(mode: string | undefined): string {
	const appMode = resolveAppMode(mode);
	if (appMode === 'localdev') return FAVICON_LOCALDEV_SRC;
	if (appMode === 'development') return FAVICON_DEVELOPMENT_SRC;
	return FAVICON_SRC;
}

export function configureFavicon() {
	const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
	if (link) {
		link.href = resolveFaviconSrc(import.meta.env.MODE);
	}
}
