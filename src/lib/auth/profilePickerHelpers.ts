export interface MembershipProfileRow {
	profile_id: string;
	role: string;
	first_name: string | null;
	last_name: string | null;
	avatar_url: string | null;
}

export interface MembershipProfileDisplay {
	profileId: string;
	role: string;
	firstName: string | null;
	lastName: string | null;
	avatarUrl: string | null;
	displayName: string;
}

/** Multi-member logins need a picker until the user picks in this browser session. */
export function shouldShowProfilePicker(params: {
	membershipCount: number;
	profileSelectionCompletedThisSession: boolean;
}): boolean {
	if (params.membershipCount <= 1) return false;
	return !params.profileSelectionCompletedThisSession;
}

export function membershipProfileDisplayName(firstName: string | null, lastName: string | null): string {
	const name = [firstName, lastName].filter(Boolean).join(' ').trim();
	return name.length > 0 ? name : 'Profiel';
}

export function mapMembershipProfilesForPicker(rows: MembershipProfileRow[]): MembershipProfileDisplay[] {
	return rows.map((row) => ({
		profileId: row.profile_id,
		role: row.role,
		firstName: row.first_name,
		lastName: row.last_name,
		avatarUrl: row.avatar_url,
		displayName: membershipProfileDisplayName(row.first_name, row.last_name),
	}));
}

/** Join membership rows with profile fields for the picker. */
export function joinMembershipsWithProfiles(
	memberships: { profile_id: string; role: string }[],
	profiles: {
		user_id: string;
		first_name: string | null;
		last_name: string | null;
		avatar_url: string | null;
	}[],
): MembershipProfileDisplay[] {
	const byId = new Map(profiles.map((profile) => [profile.user_id, profile]));
	return mapMembershipProfilesForPicker(
		memberships.map((row) => {
			const profile = byId.get(row.profile_id);
			return {
				profile_id: row.profile_id,
				role: row.role,
				first_name: profile?.first_name ?? null,
				last_name: profile?.last_name ?? null,
				avatar_url: profile?.avatar_url ?? null,
			};
		}),
	);
}

/** Initials for avatar fallback (max 2 chars). */
export function membershipProfileInitials(displayName: string): string {
	const parts = displayName.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return '?';
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}
