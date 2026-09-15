import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { beginAuthenticatedPostRequest, jsonResponse } from '../_shared/http.ts';
import { createSupabaseClients, requirePrivilegedUser } from '../_shared/supabase.ts';
import {
	type CreateStudentRequestSteps,
	readCreateStudentStepFailure,
	resolveCreateStudentAuthError,
	resolveCreateStudentPersistFailure,
	resolveCreateStudentRequestOutcome,
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

async function readStepFailure(response: Response) {
	const payload = (await response.json().catch(() => null)) as { error?: string } | null;
	return readCreateStudentStepFailure(response.status, payload);
}

function buildValidationSteps(body: CreateStudentRequestBody): CreateStudentRequestSteps | null {
	const validationFailure = resolveCreateStudentValidationFailure(validateCreateStudentBody(body));
	if (!validationFailure) return null;
	return { validationFailure, authFailure: null, userFailure: null, persistFailure: null };
}

async function resolveCreateStudentAuthAndUser(
	authHeader: string,
	body: CreateStudentRequestBody,
): Promise<
	{ kind: 'failure'; steps: CreateStudentRequestSteps } | { kind: 'success'; admin: SupabaseClient; userId: string }
> {
	const { userClient, admin } = createSupabaseClients(authHeader);
	const authn = await requirePrivilegedUser(userClient);
	if (!authn.ok) {
		return {
			kind: 'failure',
			steps: {
				validationFailure: null,
				authFailure: await readStepFailure(authn.response),
				userFailure: null,
				persistFailure: null,
			},
		};
	}

	const userResult = await resolveStudentUserId(admin, body);
	if (!userResult.ok) {
		return {
			kind: 'failure',
			steps: {
				validationFailure: null,
				authFailure: null,
				userFailure: await readStepFailure(userResult.response),
				persistFailure: null,
			},
		};
	}

	return { kind: 'success', admin, userId: userResult.userId };
}

async function resolveCreateStudentPersistSteps(
	admin: SupabaseClient,
	userId: string,
	body: CreateStudentRequestBody,
): Promise<CreateStudentRequestSteps> {
	const persistResponse = await persistCreateStudentProfileAndRow(admin, userId, body);
	if (persistResponse) {
		return {
			validationFailure: null,
			authFailure: null,
			userFailure: null,
			persistFailure: await readStepFailure(persistResponse),
		};
	}

	return {
		validationFailure: null,
		authFailure: null,
		userFailure: null,
		persistFailure: null,
		userId,
	};
}

async function collectCreateStudentRequestSteps(
	authHeader: string,
	body: CreateStudentRequestBody,
): Promise<CreateStudentRequestSteps> {
	const validationSteps = buildValidationSteps(body);
	if (validationSteps) return validationSteps;

	const authAndUser = await resolveCreateStudentAuthAndUser(authHeader, body);
	if (authAndUser.kind === 'failure') return authAndUser.steps;

	return resolveCreateStudentPersistSteps(authAndUser.admin, authAndUser.userId, body);
}

async function executeCreateStudentRequest(authHeader: string, body: CreateStudentRequestBody): Promise<Response> {
	const steps = await collectCreateStudentRequestSteps(authHeader, body);
	const outcome = resolveCreateStudentRequestOutcome(steps);
	return jsonResponse(outcome.status, outcome.body);
}

export async function handleCreateStudentRequest(req: Request): Promise<Response> {
	const begun = await beginAuthenticatedPostRequest<CreateStudentRequestBody>(req);
	if (!begun.ok) return begun.response;
	return executeCreateStudentRequest(begun.authHeader, begun.body);
}
