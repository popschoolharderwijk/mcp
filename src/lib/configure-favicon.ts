const LOCAL_FAVICON = '/favicon-local.svg';

export function configureFavicon() {
	if (!import.meta.env.DEV) {
		return;
	}

	const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
	if (link) {
		link.href = LOCAL_FAVICON;
	}
}
