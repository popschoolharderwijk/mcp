import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
	buildProfilesSearchOrFilter,
	USER_SELECT_PROFILE_COLUMNS,
	USER_SELECT_PROFILE_LIMIT,
} from '@/lib/profiles/searchProfilesForSelectHelpers';
import type { User } from '@/types/users';

/**
 * Load profiles for user-select (`filter="all"`).
 * Uses server-side ilike when searching so results are not capped to the first
 * PostgREST page ordered by first_name (default max ~1000 rows).
 * Blank search returns the first {@link USER_SELECT_PROFILE_LIMIT} by first_name
 * as a browse seed — type to search beyond that set.
 */
export async function searchProfilesForSelect(searchQuery: string): Promise<User[] | null> {
	const orFilter = buildProfilesSearchOrFilter(searchQuery);

	let query = supabase
		.from('profiles')
		.select(USER_SELECT_PROFILE_COLUMNS)
		.order('first_name')
		.limit(USER_SELECT_PROFILE_LIMIT);

	if (orFilter) {
		query = query.or(orFilter);
	}

	const { data, error } = await query;

	if (error) {
		toast.error('Fout bij laden gebruikers', { description: error.message });
		return null;
	}

	return data ?? [];
}
