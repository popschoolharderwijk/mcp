export function formatProfileFullName(
	profile: { first_name: string | null; last_name: string | null; email: string } | null,
): string {
	if (!profile) return '—';
	const fullName = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
	return fullName || profile.email;
}
