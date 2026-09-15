import type { SupabaseClient } from '@supabase/supabase-js';
import { canOpenPortalForOtherUser, resolvePortalForOtherUserForbiddenResponse } from './validationPure.ts';

export async function resolveCustomerPortalTargetUserId(
	userClient: SupabaseClient,
	requestingUserId: string,
	requestedUserId: string | undefined,
): Promise<{ targetUserId: string; error: Response | null }> {
	if (!requestedUserId || requestedUserId === requestingUserId) {
		return { targetUserId: requestingUserId, error: null };
	}

	const { data: roleData, error: roleError } = await userClient
		.from('user_roles')
		.select('role')
		.eq('user_id', requestingUserId)
		.single();

	if (roleError || !roleData) {
		return {
			targetUserId: requestingUserId,
			error: resolvePortalForOtherUserForbiddenResponse(),
		};
	}

	if (!canOpenPortalForOtherUser(roleData.role)) {
		return {
			targetUserId: requestingUserId,
			error: resolvePortalForOtherUserForbiddenResponse(),
		};
	}

	return { targetUserId: requestedUserId, error: null };
}
