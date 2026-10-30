import { beginAuthenticatedPostWithBodyValidation } from '../_shared/http.ts';
import { requireAuthenticatedClients, requireUserRole } from '../_shared/supabase.ts';
import { validateImportBody } from './importSepaStatusValidationHelpers.ts';
import type { Body } from './types.ts';

type AuthenticatedAdmin = Awaited<ReturnType<typeof requireAuthenticatedClients>>['admin'];

function beginImportSepaStatusRequest(req: Request) {
	return beginAuthenticatedPostWithBodyValidation<Body>(req, (body) => {
		const validationError = validateImportBody(body as Body);
		if (validationError) return { ok: false, response: validationError };
		return { ok: true, body: body as Body };
	});
}

async function authenticateImportSepaStatusClients(
	authHeader: string,
): Promise<{ ok: true; admin: AuthenticatedAdmin } | { ok: false; response: Response }> {
	const clients = await requireAuthenticatedClients(authHeader);
	if (!clients.ok) return { ok: false, response: clients.response };

	const roleCheck = await requireUserRole(clients.userClient, clients.user.id, ['admin', 'site_admin']);
	if (roleCheck) return { ok: false, response: roleCheck };

	return { ok: true, admin: clients.admin };
}

export async function authorizeImportSepaStatusRequest(
	req: Request,
): Promise<{ ok: true; body: Body; admin: AuthenticatedAdmin } | { ok: false; response: Response }> {
	const begun = await beginImportSepaStatusRequest(req);
	if (!begun.ok) return begun;

	const auth = await authenticateImportSepaStatusClients(begun.authHeader);
	if (!auth.ok) return auth;

	return { ok: true, body: begun.body, admin: auth.admin };
}
