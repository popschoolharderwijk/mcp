import type { UserOptional } from '@/types/users';

/** First letter of the last word of a surname (e.g. "van der Wal" → "W"). */
export function getSurnameInitial(lastName: string): string {
	const parts = lastName.trim().split(/\s+/).filter(Boolean);
	const lastWord = parts[parts.length - 1] ?? '';
	return lastWord[0] ?? '';
}

export function getUserInitials(profile: UserOptional): string {
	if (profile.first_name && profile.last_name) {
		const surnameInitial = getSurnameInitial(profile.last_name);
		if (surnameInitial) {
			return `${profile.first_name[0]}${surnameInitial}`.toUpperCase();
		}
		return profile.first_name.slice(0, 2).toUpperCase();
	}
	if (profile.first_name) {
		return profile.first_name.slice(0, 2).toUpperCase();
	}
	return (profile.email ?? '??').slice(0, 2).toUpperCase();
}
