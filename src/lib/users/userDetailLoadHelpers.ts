import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { mapUserDetailQueriesToOutcome, type UserDetailLoadOutcome } from '@/lib/users/userDetailPageHelpers';

const USER_DETAIL_PROFILE_COLUMNS =
	'user_id, email, first_name, last_name, phone_number, avatar_url, created_at, street_name, house_number, postal_code, city, country_code' as const;

export type { UserDetailLoadOutcome };

export async function loadUserDetail(userId: string): Promise<UserDetailLoadOutcome> {
	const [profileResult, roleResult] = await Promise.all([
		supabase.from('profiles').select(USER_DETAIL_PROFILE_COLUMNS).eq('user_id', userId).maybeSingle(),
		supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
	]);

	const { outcome, toastDescription } = mapUserDetailQueriesToOutcome(profileResult, roleResult);
	if (toastDescription !== null) {
		toast.error('Fout bij laden gebruiker', { description: toastDescription });
	}
	return outcome;
}
