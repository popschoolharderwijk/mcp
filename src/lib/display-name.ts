import type { UserOptional } from '@/types/users';

/** Display name from profile (first + last name, or single name, or email, or 'Onbekend'). */
export function getDisplayName(profile?: UserOptional | null): string {
	if (!profile) return 'Onbekend';
	if (profile.first_name && profile.last_name) {
		return `${profile.first_name} ${profile.last_name}`;
	}
	return profile.first_name ?? profile.last_name ?? profile.email ?? 'Onbekend';
}

/** First name for compact multi-student calendar labels; falls back like getDisplayName. */
export function getFirstName(profile?: UserOptional | null): string {
	if (!profile) return 'Onbekend';
	return profile.first_name ?? profile.last_name ?? profile.email ?? 'Onbekend';
}

/** Sorted "Levy & Simon" label for multi-student agenda blocks. */
export function joinFirstNames(profiles: Array<UserOptional | null | undefined>): string {
	return profiles
		.map((profile) => getFirstName(profile))
		.sort((left, right) => left.localeCompare(right, 'nl'))
		.join(' & ');
}
