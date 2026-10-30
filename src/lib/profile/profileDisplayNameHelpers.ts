export type ProfileNameFields = {
	first_name: string | null;
	last_name: string | null;
	email: string;
};

/** Full name from profile fields, or em dash when missing; falls back to email when name is empty. */
export function formatProfileFullName(profile: ProfileNameFields | null): string {
	if (!profile) return '—';

	const fullName = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
	return fullName || profile.email;
}
