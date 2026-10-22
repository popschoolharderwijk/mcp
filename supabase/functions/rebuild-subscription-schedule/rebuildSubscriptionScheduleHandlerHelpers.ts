import { beginAuthenticatedPostRequest } from '../_shared/http.ts';
import { createSupabaseClients, requirePrivilegedUser } from '../_shared/supabase.ts';
import { validateRebuildScheduleBody } from './validation.ts';

type PrivilegedClients = ReturnType<typeof createSupabaseClients>;

export async function authenticateRebuildScheduleRequest(
	req: Request,
): Promise<
	| { ok: true; admin: PrivilegedClients['admin']; body: { lesson_agreement_id?: string; lesson_type_id?: string } }
	| { ok: false; response: Response }
> {
	const begun = await beginAuthenticatedPostRequest<{ lesson_agreement_id?: string; lesson_type_id?: string }>(req);
	if (!begun.ok) return { ok: false, response: begun.response };

	const validationError = validateRebuildScheduleBody(begun.body);
	if (validationError) return { ok: false, response: validationError };

	const clients = createSupabaseClients(begun.authHeader);
	const authn = await requirePrivilegedUser(clients.userClient);
	if (!authn.ok) return { ok: false, response: authn.response };

	return { ok: true, admin: clients.admin, body: begun.body };
}
