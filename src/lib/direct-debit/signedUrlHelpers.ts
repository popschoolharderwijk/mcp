export function resolveSignedStorageUrlResult(
	data: { signedUrl?: string } | null,
	error: { message?: string } | null,
): { ok: true; signedUrl: string } | { ok: false; error: string } {
	if (error || !data?.signedUrl) {
		return { ok: false, error: error?.message ?? 'Geen URL' };
	}
	return { ok: true, signedUrl: data.signedUrl };
}
