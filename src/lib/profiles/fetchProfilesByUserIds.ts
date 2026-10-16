import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { USER_SELECT_PROFILE_COLUMNS } from '@/lib/profiles/searchProfilesForSelectHelpers';
import type { User } from '@/types/users';

/** Load profile rows for a set of user IDs (user select components). */
export async function fetchProfilesByUserIds(userIds: string[]): Promise<User[] | null> {
	if (userIds.length === 0) {
		return [];
	}

	const { data: profilesData, error: profilesError } = await supabase
		.from('profiles')
		.select(USER_SELECT_PROFILE_COLUMNS)
		.in('user_id', userIds)
		.order('first_name');

	if (profilesError) {
		toast.error('Fout bij laden gebruikers', { description: profilesError.message });
		return null;
	}

	return profilesData ?? [];
}
