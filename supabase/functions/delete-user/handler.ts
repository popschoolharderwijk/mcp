import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/http.ts';
import { resolveDeleteUserRequestAuth } from './deleteUserHandlerHelpers.ts';
import { executeDeleteUser } from './executeDeleteUser.ts';

function createDeleteUserAdminClient() {
	return createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});
}

export async function handleDeleteUserRequest(req: Request, authHeader: string): Promise<Response> {
	const supabaseAdmin = createDeleteUserAdminClient();
	const token = authHeader.replace('Bearer ', '');
	const {
		data: { user: requestingUser },
		error: userError,
	} = await supabaseAdmin.auth.getUser(token);

	const authFailure = resolveDeleteUserRequestAuth(userError, requestingUser);
	if (authFailure) return jsonResponse(authFailure.status, { error: authFailure.error });

	return executeDeleteUser(supabaseAdmin, requestingUser.id, await req.text());
}
