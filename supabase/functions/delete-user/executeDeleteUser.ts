import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/http.ts';
import { buildDeleteUserSuccessResponse } from './deleteUserHandlerHelpers.ts';
import { mapDeleteUserError, parseDeleteUserBody, resolveDeleteUserTargetId } from './handlers.ts';

export async function executeDeleteUser(
	supabaseAdmin: SupabaseClient,
	requestingUserId: string,
	bodyText: string,
): Promise<Response> {
	const body = parseDeleteUserBody(bodyText);
	const target = await resolveDeleteUserTargetId(supabaseAdmin, requestingUserId, body.userId);
	if (target.error) return target.error;

	const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(target.targetUserId);
	if (deleteError) return mapDeleteUserError(deleteError.message || 'Failed to delete account');

	return jsonResponse(200, buildDeleteUserSuccessResponse());
}
