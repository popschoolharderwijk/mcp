import type { SupabaseClient } from '@supabase/supabase-js';

export function resolveLegacyPersonCreated(existingUserId: string | undefined): boolean {
	return !existingUserId;
}

export function buildLegacyProfilePayload(
	userId: string,
	email: string,
	firstName: string | null | undefined,
	lastName: string | null | undefined,
	phone: string | null | undefined,
): {
	user_id: string;
	email: string;
	first_name: string | null;
	last_name: string | null;
	phone_number: string | null;
} {
	return {
		user_id: userId,
		email,
		first_name: firstName ?? null,
		last_name: lastName ?? null,
		phone_number: phone ?? null,
	};
}

async function upsertLegacyProfile(
	admin: SupabaseClient,
	userId: string,
	email: string,
	firstName: string | null,
	lastName: string | null,
	phone: string | null,
): Promise<void> {
	const { error } = await admin
		.from('profiles')
		.upsert(buildLegacyProfilePayload(userId, email, firstName, lastName, phone), {
			onConflict: 'user_id',
		});
	if (error) throw error;
}

async function upsertLegacyRole(admin: SupabaseClient, userId: string, role: 'student' | 'teacher'): Promise<void> {
	const { error } = await admin.from('user_roles').upsert({ user_id: userId, role }, { onConflict: 'user_id,role' });
	if (error) throw error;
}

export async function resolveLegacyPersonUserId(options: {
	admin: SupabaseClient;
	personMap: Map<string, string>;
	legacyId: string;
	email: string;
	firstName: string | null | undefined;
	lastName: string | null | undefined;
	phone: string | null | undefined;
	role: 'student' | 'teacher';
	ensureAuthUser: (
		admin: SupabaseClient,
		email: string,
		firstName: string | null | undefined,
		lastName: string | null | undefined,
	) => Promise<string>;
}): Promise<{ userId: string; created: boolean }> {
	const existingUserId = options.personMap.get(options.legacyId);
	const userId =
		existingUserId ??
		(await options.ensureAuthUser(options.admin, options.email, options.firstName, options.lastName));

	await upsertLegacyProfile(
		options.admin,
		userId,
		options.email,
		options.firstName ?? null,
		options.lastName ?? null,
		options.phone ?? null,
	);
	await upsertLegacyRole(options.admin, userId, options.role);

	return { userId, created: resolveLegacyPersonCreated(existingUserId) };
}
