import { beginAuthenticatedPostRequest, jsonResponse } from '../_shared/http.ts';
import { requireAuthenticatedClients, requireUserRole } from '../_shared/supabase.ts';
import type { Body } from './types.ts';
import { validateDuoBody } from './validation.ts';
import { verifyDuoLessonType } from './verifyDuoLessonType.ts';

type AuthenticatedAdmin = Awaited<ReturnType<typeof requireAuthenticatedClients>>['admin'];

async function beginCreateDuoRequest(
	req: Request,
): Promise<{ ok: true; body: Body; authHeader: string } | { ok: false; response: Response }> {
	const begun = await beginAuthenticatedPostRequest<unknown>(req);
	if (!begun.ok) return { ok: false, response: begun.response };

	const parsed = validateDuoBody(begun.body);
	if (!parsed.ok) return { ok: false, response: jsonResponse(400, { error: parsed.error }) };

	return { ok: true, body: parsed.value, authHeader: begun.authHeader };
}

async function authenticateCreateDuoClients(
	authHeader: string,
): Promise<{ ok: true; admin: AuthenticatedAdmin } | { ok: false; response: Response }> {
	const auth = await requireAuthenticatedClients(authHeader);
	if (!auth.ok) return { ok: false, response: auth.response };

	const denied = await requireUserRole(auth.userClient, auth.user.id, ['admin', 'site_admin', 'teacher']);
	if (denied) return { ok: false, response: denied };

	return { ok: true, admin: auth.admin };
}

export async function authenticateCreateDuoRequest(
	req: Request,
): Promise<{ ok: true; admin: AuthenticatedAdmin; body: Body } | { ok: false; response: Response }> {
	const begun = await beginCreateDuoRequest(req);
	if (!begun.ok) return begun;

	const auth = await authenticateCreateDuoClients(begun.authHeader);
	if (!auth.ok) return auth;

	const lessonTypeCheck = await verifyDuoLessonType(auth.admin, begun.body.lesson_type_id);
	if (!lessonTypeCheck.ok) return { ok: false, response: lessonTypeCheck.response };

	return { ok: true, admin: auth.admin, body: begun.body };
}
