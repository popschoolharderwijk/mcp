import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
	type CreateUserRequestBody,
	canAssignCreateUserRole,
	isDuplicateCreateUserError,
	isValidCreateUserEmail,
} from './create-user-validation.ts';
import {
	buildCreateUserRoleWarningResponse,
	buildCreateUserSuccessResponse,
	hasCreatedAuthUser,
	resolveMissingCreatedUserError,
	shouldAssignCreateUserRole,
	shouldUpdateCreatedUserPhone,
} from './createUserHandlersPure.ts';
import { jsonResponse } from './http.ts';

type CreateUserRequest = CreateUserRequestBody;

function validateCreateUserRequest(body: CreateUserRequest): Response | null {
	if (!body.email) return jsonResponse(400, { error: 'Email is verplicht' });
	if (!isValidCreateUserEmail(body.email)) return jsonResponse(400, { error: 'Ongeldig e-mailadres' });
	return null;
}

function authorizeCreateUserRole(
	requesterRole: string | null | undefined,
	targetRole: CreateUserRequest['role'],
): Response | null {
	if (!canAssignCreateUserRole(requesterRole, targetRole)) {
		if (requesterRole === 'admin' && targetRole === 'site_admin') {
			return jsonResponse(403, { error: 'Admins kunnen geen site_admin rollen toewijzen' });
		}
		return jsonResponse(403, { error: 'Je hebt geen rechten om gebruikers aan te maken.' });
	}
	return null;
}

function mapCreateUserError(message: string): Response {
	if (isDuplicateCreateUserError(message)) {
		return jsonResponse(409, { error: 'Een gebruiker met dit e-mailadres bestaat al.' });
	}
	return jsonResponse(400, { error: message });
}

async function fetchRequesterRole(
	supabaseUser: SupabaseClient,
	userId: string,
): Promise<{ role: string | null; error: Response | null }> {
	const { data: rolesCheck, error: rolesCheckError } = await supabaseUser
		.from('user_roles')
		.select('role')
		.eq('user_id', userId)
		.single();

	if (rolesCheckError || !rolesCheck?.role) {
		return { role: null, error: jsonResponse(403, { error: 'Je hebt geen rechten om gebruikers aan te maken.' }) };
	}
	return { role: rolesCheck.role, error: null };
}

async function updateCreatedUserPhone(
	supabaseAdmin: SupabaseClient,
	userId: string,
	phoneNumber: string,
): Promise<void> {
	const { error: profileUpdateError } = await supabaseAdmin
		.from('profiles')
		.update({ phone_number: phoneNumber })
		.eq('user_id', userId);

	if (profileUpdateError) {
		console.error('Error updating phone_number:', profileUpdateError);
	}
}

async function assignUserRole(
	supabaseUser: SupabaseClient,
	userId: string,
	role: NonNullable<CreateUserRequest['role']>,
): Promise<Response | null> {
	const { error: roleInsertError } = await supabaseUser.from('user_roles').insert({
		user_id: userId,
		role,
	});

	if (!roleInsertError) return null;

	console.error('Error assigning role:', roleInsertError);
	return jsonResponse(200, buildCreateUserRoleWarningResponse(userId, roleInsertError.message));
}

function createCreateUserClients(authHeader: string): {
	supabaseUser: SupabaseClient;
	supabaseAdmin: SupabaseClient;
} {
	const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
	const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
	const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
		global: { headers: { Authorization: authHeader } },
		auth: { autoRefreshToken: false, persistSession: false },
	});
	const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
		auth: { autoRefreshToken: false, persistSession: false },
	});
	return { supabaseUser, supabaseAdmin };
}

async function createAuthUserRecord(
	supabaseAdmin: SupabaseClient,
	body: CreateUserRequest,
): Promise<{ user: { id: string; email?: string } | null; error: Response | null }> {
	const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
		email: body.email,
		email_confirm: true,
		user_metadata: {
			first_name: body.first_name ?? null,
			last_name: body.last_name ?? null,
		},
	});

	if (createError) return { user: null, error: mapCreateUserError(createError.message) };
	return resolveCreatedAuthUserRecord(newUser.user);
}

function resolveCreatedAuthUserRecord(user: { id: string; email?: string } | null | undefined): {
	user: { id: string; email?: string } | null;
	error: Response | null;
} {
	if (!hasCreatedAuthUser(user)) {
		return { user: null, error: jsonResponse(500, { error: resolveMissingCreatedUserError() }) };
	}
	return { user, error: null };
}

export async function processCreateUserRequest(req: Request, authHeader: string): Promise<Response> {
	const body: CreateUserRequest = await req.json();

	const validationError = validateCreateUserRequest(body);
	if (validationError) return validationError;

	const { supabaseUser, supabaseAdmin } = createCreateUserClients(authHeader);
	const created = await createUserWithAuthorization(supabaseUser, supabaseAdmin, body);
	if (created.error) return created.error;

	return jsonResponse(200, buildCreateUserSuccessResponse(created.userId, created.email));
}

async function authorizeCreateUserRequest(
	supabaseUser: SupabaseClient,
	body: CreateUserRequest,
): Promise<Response | null> {
	const {
		data: { user: requestingUser },
		error: userError,
	} = await supabaseUser.auth.getUser();

	if (userError || !requestingUser) {
		return jsonResponse(401, { error: 'Invalid or expired token' });
	}

	const { role: requesterRole, error: roleError } = await fetchRequesterRole(supabaseUser, requestingUser.id);
	if (roleError) return roleError;

	return authorizeCreateUserRole(requesterRole, body.role);
}

async function finalizeCreatedUser(
	supabaseUser: SupabaseClient,
	supabaseAdmin: SupabaseClient,
	body: CreateUserRequest,
	user: { id: string; email?: string },
): Promise<Response | null> {
	if (shouldUpdateCreatedUserPhone(body.phone_number)) {
		await updateCreatedUserPhone(supabaseAdmin, user.id, body.phone_number);
	}

	if (shouldAssignCreateUserRole(body.role)) {
		return assignUserRole(supabaseUser, user.id, body.role);
	}

	return null;
}

async function createUserWithAuthorization(
	supabaseUser: SupabaseClient,
	supabaseAdmin: SupabaseClient,
	body: CreateUserRequest,
): Promise<{ userId: string; email: string | undefined; error: Response | null }> {
	const authorizationError = await authorizeCreateUserRequest(supabaseUser, body);
	if (authorizationError) return { userId: '', email: undefined, error: authorizationError };

	return finalizeAuthorizedCreateUser(supabaseUser, supabaseAdmin, body);
}

async function finalizeAuthorizedCreateUser(
	supabaseUser: SupabaseClient,
	supabaseAdmin: SupabaseClient,
	body: CreateUserRequest,
): Promise<{ userId: string; email: string | undefined; error: Response | null }> {
	const created = await createAuthUserRecord(supabaseAdmin, body);
	if (!hasCreatedAuthUser(created.user)) {
		return {
			userId: '',
			email: undefined,
			error: created.error ?? jsonResponse(500, { error: resolveMissingCreatedUserError() }),
		};
	}

	const followUpError = await finalizeCreatedUser(supabaseUser, supabaseAdmin, body, created.user);
	if (followUpError) return { userId: '', email: undefined, error: followUpError };

	return { userId: created.user.id, email: created.user.email, error: null };
}
