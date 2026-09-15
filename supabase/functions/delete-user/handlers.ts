import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/http.ts';
import {
	isLastSiteAdminDeleteError,
	isSelfDeleteRequest,
	resolveDeleteUserRoleFromQuery,
	resolveDeleteUserTargetFromRole,
} from './handlersPure.ts';

export { parseDeleteUserBody } from './handlersPure.ts';

export async function resolveDeleteUserTargetId(
	supabaseAdmin: SupabaseClient,
	requestingUserId: string,
	requestedUserId: string | undefined,
): Promise<{ targetUserId: string; error: Response | null }> {
	if (isSelfDeleteRequest(requestedUserId, requestingUserId)) {
		return { targetUserId: requestingUserId, error: null };
	}

	const { data: roleData, error: roleError } = await supabaseAdmin
		.from('user_roles')
		.select('role')
		.eq('user_id', requestingUserId)
		.single();

	const mapped = resolveDeleteUserTargetFromRole(
		requestingUserId,
		requestedUserId,
		resolveDeleteUserRoleFromQuery(roleData, roleError),
	);
	if (mapped.error) {
		return {
			targetUserId: mapped.targetUserId,
			error: jsonResponse(mapped.error.status, { error: mapped.error.error }),
		};
	}

	return { targetUserId: mapped.targetUserId, error: null };
}

export function mapDeleteUserError(message: string): Response {
	if (isLastSiteAdminDeleteError(message)) {
		return jsonResponse(400, {
			error: 'Dit is de laatste site administrator. Maak eerst een andere gebruiker site_admin voordat dit account verwijderd kan worden.',
			code: 'last_site_admin',
		});
	}
	return jsonResponse(400, { error: message });
}
