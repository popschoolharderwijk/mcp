import { formatProfileFullName } from '@/lib/profile/profileDisplayNameHelpers';

type MandateProfile = {
	first_name: string | null;
	last_name: string | null;
	email: string;
	avatar_url?: string | null;
};

export { formatProfileFullName };

/** Many-to-one embeds are one object at runtime; generated types type them as an array. */
export function firstMandateProfile(profiles: MandateProfile | MandateProfile[] | null): MandateProfile | null {
	if (profiles == null) return null;
	return Array.isArray(profiles) ? (profiles[0] ?? null) : profiles;
}

export function mandateListProfileName(profiles: MandateProfile | MandateProfile[] | null): string {
	return formatProfileFullName(firstMandateProfile(profiles));
}
