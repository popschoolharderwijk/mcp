const FAVICON_SRC = '/favicon.svg';
const FAVICON_LOCAL_SRC = '/favicon-local.svg';

export function resolveFaviconSrc(isDev: boolean): string {
	return isDev ? FAVICON_LOCAL_SRC : FAVICON_SRC;
}

export function configureFavicon() {
	const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
	if (link) {
		link.href = resolveFaviconSrc(import.meta.env.DEV);
	}
}
