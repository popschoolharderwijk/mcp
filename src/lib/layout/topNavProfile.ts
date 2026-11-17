import { supabase } from '@/integrations/supabase/client';
import type { TopNavProfile } from '@/lib/layout/topNavHelpers';

export async function fetchUserRoleAndProfile(userId: string): Promise<{
	role: string | null;
	profile: TopNavProfile | null;
}> {
	const [roleResult, profileResult] = await Promise.all([
		supabase.from('user_roles').select('role').eq('user_id', userId).limit(1),
		supabase.from('profiles').select('first_name, last_name, avatar_url').eq('user_id', userId).single(),
	]);

	return {
		role: roleResult.data?.[0]?.role ?? null,
		profile: profileResult.data ?? null,
	};
}
