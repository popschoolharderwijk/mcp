try {
	const stored = localStorage.getItem('mplifi-theme');
	const preferDark = stored === 'dark' || (stored !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
	document.documentElement.classList.add(preferDark ? 'dark' : 'light');
	const meta = document.querySelector('meta[name="color-scheme"]');
	if (meta) {
		meta.content = stored === 'light' || stored === 'dark' ? stored : 'light dark';
	}
} catch {
	/* localStorage can throw when site data is blocked */
}
