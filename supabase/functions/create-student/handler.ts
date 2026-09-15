import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { beginAuthenticatedPostRequest, jsonResponse } from '../_shared/http.ts';
import { createSupabaseClients, requirePrivilegedUser } from '../_shared/supabase.ts';
import {
	resolveCreateStudentAuthError,
	resolveCreateStudentPersistFailure,
	resolveCreateStudentValidationFailure,
} from './createStudentHandlerPure.ts';
import {
	buildStudentAuthCreatePayload,
	buildStudentProfileFields,
	buildStudentRowFields,
	type CreateStudentRequestBody,
	resolveExistingStudentUserId,
	validateCreateStudentBody,
} from './createStudentPure.ts';

async function createStudentAuthUser(
	admin: SupabaseClient,
	body: CreateStudentRequestBody,
): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
	const { data: created, error: createErr } = await admin.auth.admin.createUser(buildStudentAuthCreatePayload(body));
	if (createErr) {
		const mapped = resolveCreateStudentAuthError(createErr.message);
		return { ok: false, response: jsonResponse(mapped.status, { error: mapped.error }) };
	}
	if (!created.user) {
		return { ok: false, response: jsonResponse(500, { error: 'Kon gebruiker niet aanmaken' }) };
	}
	return { ok: true, userId: created.user.id };
}

async function resolveExistingStudentUser(
	admin: SupabaseClient,
	userId: string,
): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
	const { data: profile, error } = await admin.from('profiles').select('user_id').eq('user_id', userId).maybeSingle();
	if (error || !profile) {
		return { ok: false, response: jsonResponse(404, { error: 'Gebruiker niet gevonden' }) };
	}
	return { ok: true, userId: profile.user_id };
}

async function resolveStudentUserId(
	admin: SupabaseClient,
	body: CreateStudentRequestBody,
): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
	const existingUserId = resolveExistingStudentUserId(body);
	if (existingUserId) return resolveExistingStudentUser(admin, existingUserId);
	return createStudentAuthUser(admin, body);
}

function persistFailureResponse(writeError: unknown, error: string): Response | null {
	const mapped = resolveCreateStudentPersistFailure(writeError, error);
	if (!mapped) return null;
	return jsonResponse(mapped.status, { error: mapped.error });
}

async function persistCreateStudentProfileAndRow(
	admin: SupabaseClient,
	userId: string,
	body: CreateStudentRequestBody,
): Promise<Response | null> {
	const { error: profileError } = await admin
		.from('profiles')
		.update(buildStudentProfileFields(body))
		.eq('user_id', userId);
	const profileFailure = persistFailureResponse(profileError, 'Kon profiel niet bijwerken');
	if (profileFailure) return profileFailure;

	const { error: ensureError } = await admin.rpc('ensure_student_exists', { _user_id: userId });
	const ensureFailure = persistFailureResponse(ensureError, 'Kon leerlingrecord niet aanmaken');
	if (ensureFailure) return ensureFailure;

	const { error: studentError } = await admin
		.from('students')
		.update(buildStudentRowFields(body))
		.eq('user_id', userId);
	return persistFailureResponse(studentError, 'Kon leerlingrecord niet bijwerken');
}

async function executeCreateStudentRequest(authHeader: string, body: CreateStudentRequestBody): Promise<Response> {
	const validationFailure = resolveCreateStudentValidationFailure(validateCreateStudentBody(body));
	if (validationFailure) {
		return jsonResponse(validationFailure.status, { error: validationFailure.error });
	}

	const { userClient, admin } = createSupabaseClients(authHeader);
	const authn = await requirePrivilegedUser(userClient);
	if (!authn.ok) return authn.response;

	const userResult = await resolveStudentUserId(admin, body);
	if (!userResult.ok) return userResult.response;

	const persistFailure = await persistCreateStudentProfileAndRow(admin, userResult.userId, body);
	if (persistFailure) return persistFailure;

	return jsonResponse(200, { user_id: userResult.userId });
}

export async function handleCreateStudentRequest(req: Request): Promise<Response> {
	const begun = await beginAuthenticatedPostRequest<CreateStudentRequestBody>(req);
	if (!begun.ok) return begun.response;
	return executeCreateStudentRequest(begun.authHeader, begun.body);
}
