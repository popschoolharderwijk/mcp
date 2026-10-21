import { createClient, type SupabaseClient, type User } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from './http.ts';

export type SupabaseClients = {
	userClient: SupabaseClient;
	admin: SupabaseClient;
};

export function createSupabaseClients(authHeader: string): SupabaseClients {
	const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
	const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
	const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

	return {
		userClient: createClient(supabaseUrl, anonKey, {
			global: { headers: { Authorization: authHeader } },
			auth: { autoRefreshToken: false, persistSession: false },
		}),
		admin: createClient(supabaseUrl, serviceKey, {
			auth: { autoRefreshToken: false, persistSession: false },
		}),
	};
}

type RequireUserResult = { ok: true; user: User } | { ok: false; response: Response };

export async function requireAuthenticatedUser(userClient: SupabaseClient): Promise<RequireUserResult> {
	const {
		data: { user },
		error: userErr,
	} = await userClient.auth.getUser();
	if (userErr || !user) return { ok: false, response: jsonResponse(401, { error: 'Invalid token' }) };
	return { ok: true, user };
}

export async function fetchUserRole(userClient: SupabaseClient, userId: string): Promise<string | null> {
	const { data: roleRow } = await userClient.from('user_roles').select('role').eq('user_id', userId).single();
	return roleRow?.role ?? null;
}

export async function requireAdminUser(userClient: SupabaseClient): Promise<RequireUserResult> {
	const authn = await requireAuthenticatedUser(userClient);
	if (!authn.ok) return authn;

	const role = await fetchUserRole(userClient, authn.user.id);
	if (role !== 'admin' && role !== 'site_admin') {
		return { ok: false, response: jsonResponse(403, { error: 'Geen rechten' }) };
	}

	return authn;
}

type AuthenticatedClientsResult =
	| { ok: true; userClient: SupabaseClient; admin: SupabaseClient; user: User }
	| { ok: false; response: Response };

export async function requireAuthenticatedClients(authHeader: string): Promise<AuthenticatedClientsResult> {
	const clients = createSupabaseClients(authHeader);
	const authn = await requireAuthenticatedUser(clients.userClient);
	if (!authn.ok) return authn;
	return { ok: true, ...clients, user: authn.user };
}

export async function requireUserRole(
	userClient: SupabaseClient,
	userId: string,
	allowedRoles: string[],
	errorMessage = 'Geen rechten',
): Promise<Response | null> {
	const role = await fetchUserRole(userClient, userId);
	if (!role || !allowedRoles.includes(role)) {
		return jsonResponse(403, { error: errorMessage });
	}
	return null;
}

export async function requirePrivilegedUser(userClient: SupabaseClient): Promise<RequireUserResult> {
	const authn = await requireAuthenticatedUser(userClient);
	if (!authn.ok) return authn;

	const { data: privileged, error: privErr } = await userClient.rpc('is_privileged');
	if (privErr || privileged !== true) {
		return { ok: false, response: jsonResponse(403, { error: 'Onvoldoende rechten' }) };
	}

	return authn;
}

/** Service-role client for public endpoints that authorise via their own token check. */
export function createAdminClient(): SupabaseClient {
	return createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
		auth: { autoRefreshToken: false, persistSession: false },
	});
}
