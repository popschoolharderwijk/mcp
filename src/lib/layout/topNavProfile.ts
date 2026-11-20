import { supabase } from '@/integrations/supabase/client';
import type { TopNavProfile } from '@/lib/layout/topNavHelpers';

export async function fetchUserRoleAndProfile(
	loginUserId: string,
	activeProfileId: string,
): Promise<{
	role: string | null;
	profile: TopNavProfile | null;
}> {
	const [roleResult, profileResult] = await Promise.all([
		supabase.from('user_roles').select('role').eq('user_id', loginUserId).limit(1),
		supabase.from('profiles').select('first_name, last_name, avatar_url').eq('user_id', activeProfileId).limit(1),
	]);

	return {
		role: roleResult.data?.[0]?.role ?? null,
		profile: profileResult.data?.[0] ?? null,
	};
}
