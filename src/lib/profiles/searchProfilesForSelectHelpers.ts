import type { User } from '@/types/users';

/** Max rows returned for user-select dropdown queries (avoids PostgREST silent truncation). */
export const USER_SELECT_PROFILE_LIMIT = 100;

/** Debounce for server-side user-select search. */
export const USER_SELECT_SEARCH_DEBOUNCE_MS = 300;

export const USER_SELECT_PROFILE_COLUMNS = 'user_id, first_name, last_name, email, avatar_url, phone_number' as const;

const PROFILE_SEARCH_COLUMNS = ['first_name', 'last_name', 'email'] as const;

function escapeIlikeToken(token: string): string {
	return token.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_').replace(/"/g, '');
}

function orFilterForToken(token: string): string {
	const pattern = `%${escapeIlikeToken(token)}%`;
	return PROFILE_SEARCH_COLUMNS.map((column) => `${column}.ilike."${pattern}"`).join(',');
}

/**
 * PostgREST filter passed to `.or()`.
 * One token is a column or-list. Several tokens become and(or(...),or(...))
 * so every token must match first name, last name, or email.
 * Quoted patterns keep commas in the query from splitting the filter list.
 */
export function buildProfilesSearchOrFilter(rawQuery: string): string | null {
	const tokens = rawQuery.trim().split(/\s+/).filter(Boolean);
	if (tokens.length === 0) return null;

	const groups = tokens.map(orFilterForToken);
	if (groups.length === 1) return groups[0] ?? null;

	return `and(${groups.map((group) => `or(${group})`).join(',')})`;
}

/** Lowercased "first last" used for client match and ranking. */
function profileDisplayName(user: User): string {
	return [user.first_name, user.last_name].filter(Boolean).join(' ').toLowerCase();
}

/** True when every search token appears in the joined name or email. */
export function matchesProfileSearch(user: User, rawQuery: string): boolean {
	const trimmed = rawQuery.trim().toLowerCase();
	if (!trimmed) return true;

	const name = profileDisplayName(user);
	const email = user.email.toLowerCase();
	if (name.includes(trimmed) || email.includes(trimmed)) return true;

	return trimmed.split(/\s+/).every((token) => name.includes(token) || email.includes(token));
}

/** Lower score = better match. Name hits rank above email-only hits. */
export function profileSearchMatchScore(user: User, rawQuery: string): number {
	const query = rawQuery.trim().toLowerCase();
	if (!query) return 0;

	const name = profileDisplayName(user);
	if (name === query) return 0;
	if (name.startsWith(query)) return 1;
	if (name.includes(query)) return 2;
	if (user.email.toLowerCase().includes(query)) return 3;
	if (matchesProfileSearch(user, query)) return 4;
	return 5;
}

/** Stable rank so a person named "test" appears above dozens of *@test.nl email matches. */
export function rankProfilesBySearch(users: User[], rawQuery: string): User[] {
	const query = rawQuery.trim();
	if (!query) return users;

	return [...users].sort((a, b) => {
		const scoreDiff = profileSearchMatchScore(a, query) - profileSearchMatchScore(b, query);
		if (scoreDiff !== 0) return scoreDiff;
		return profileDisplayName(a).localeCompare(profileDisplayName(b));
	});
}
