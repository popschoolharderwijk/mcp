import { supabase } from '@/integrations/supabase/client';
import { PROFILE_ADDRESS_SELECT } from '@/lib/profile/profileAddressHelpers';
import type { Teacher } from '@/types/teachers';

export async function fetchTeacherProfile(userId: string): Promise<Teacher | null> {
	const { data: teacherData, error: teacherError } = await supabase
		.from('teachers')
		.select('user_id, bio, coc_issued_on, is_active, created_at, updated_at')
		.eq('user_id', userId)
		.single();

	if (teacherError) {
		console.error('Error loading teacher:', teacherError);
		return null;
	}

	const profileQuery = await supabase
		.from('profiles')
		.select(`user_id, first_name, last_name, email, avatar_url, phone_number, ${PROFILE_ADDRESS_SELECT}`)
		.eq('user_id', teacherData.user_id)
		.single();

	const profileData = profileQuery.data as unknown as Teacher | null;
	if (profileQuery.error || !profileData) {
		console.error('Error loading profile:', profileQuery.error);
		return null;
	}

	return {
		...teacherData,
		...profileData,
	};
}
