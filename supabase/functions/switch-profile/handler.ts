import type { SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2';
import { beginAuthenticatedPostRequest, jsonResponse } from '../_shared/http.ts';
import { createSupabaseClients, requireAuthenticatedUser } from '../_shared/supabase.ts';
import {
	buildActiveProfileAppMetadata,
	parseSwitchProfileBody,
	resolveSwitchMembershipGate,
	resolveSwitchProfileUpdateGate,
} from './switchProfileHelpers.ts';

async function finishSwitchProfile(args: { admin: SupabaseClient; user: User; profileId: string }): Promise<Response> {
	const { admin, user, profileId } = args;

	const { data: membership, error: membershipError } = await admin
		.from('account_memberships')
		.select('profile_id')
		.eq('login_user_id', user.id)
		.eq('profile_id', profileId)
		.maybeSingle();

	const membershipGate = resolveSwitchMembershipGate(membership, membershipError);
	if (!membershipGate.ok) {
		console.error('switch-profile membership lookup', membershipGate.status, membershipError);
		return jsonResponse(membershipGate.status, { error: membershipGate.error });
	}

	const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(user.id, {
		app_metadata: buildActiveProfileAppMetadata(
			user.app_metadata as Record<string, unknown> | undefined,
			profileId,
		),
	});

	const updateGate = resolveSwitchProfileUpdateGate(updated.user, updateError);
	if (!updateGate.ok) {
		console.error('switch-profile updateUserById', updateError);
		return jsonResponse(updateGate.status, { error: updateGate.error });
	}

	return jsonResponse(200, {
		active_profile_id: profileId,
		login_user_id: user.id,
	});
}

export async function handleSwitchProfileRequest(req: Request): Promise<Response> {
	const begun = await beginAuthenticatedPostRequest<unknown>(req);
	if (!begun.ok) return begun.response;

	const parsed = parseSwitchProfileBody(begun.body);
	if (!parsed.ok) return jsonResponse(400, { error: parsed.error });

	const { userClient, admin } = createSupabaseClients(begun.authHeader);
	const authn = await requireAuthenticatedUser(userClient);
	if (!authn.ok) return authn.response;

	return finishSwitchProfile({ admin, user: authn.user, profileId: parsed.profileId });
}
