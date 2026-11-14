export function getSafeErrorMessage(err: unknown, fallback = 'Onverwachte fout'): string {
	if (err instanceof Error) {
		return err.message.split('\n')[0].slice(0, 300);
	}
	return fallback;
}
