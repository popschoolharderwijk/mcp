import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/http.ts';
import { getSiteBaseUrl, type LessonAgreementPostContext } from '../_shared/http-serve.ts';
import { getSafeErrorMessage } from '../_shared/stripe.ts';
import { fetchUserRole, requireAuthenticatedClients } from '../_shared/supabase.ts';
import {
	buildDirectDebitInviteRedirectUrl,
	buildDirectDebitInviteSuccessPayload,
	isDirectDebitInvitePrivilegedRole,
	resolveDirectDebitAgreementAccessError,
	resolveDirectDebitInviteMissingEmailResponse,
	resolveDirectDebitInviteRecipient,
} from './sendDirectDebitInvitePure.ts';

type DirectDebitInviteContext =
	| { ok: false; response: Response }
	| {
			ok: true;
			admin: SupabaseClient;
			userId: string;
			agreement: { id: string; student_user_id: string };
			recipient: string;
			redirectTo: string;
	  };

async function prepareDirectDebitInvite(ctx: LessonAgreementPostContext): Promise<DirectDebitInviteContext> {
	const auth = await requireAuthenticatedClients(ctx.authHeader);
	if (!auth.ok) return { ok: false, response: auth.response };

	const role = await fetchUserRole(auth.userClient, auth.user.id);
	const isPrivileged = isDirectDebitInvitePrivilegedRole(role);

	const { data: agreement, error: agErr } = await auth.admin
		.from('lesson_agreements')
		.select('id, student_user_id, is_active')
		.eq('id', ctx.lessonAgreementId)
		.maybeSingle();
	const access = resolveDirectDebitAgreementAccessError(agreement, agErr, isPrivileged, auth.user.id);
	if (!access.ok) {
		return { ok: false, response: jsonResponse(access.status, { error: access.error }) };
	}

	const recipientResult = await resolveDirectDebitInviteRecipientEmail(auth.admin, access.agreement.student_user_id);
	if (!recipientResult.ok) return recipientResult;

	return {
		ok: true,
		admin: auth.admin,
		userId: auth.user.id,
		agreement: access.agreement,
		recipient: recipientResult.recipient,
		redirectTo: buildDirectDebitInviteRedirectUrl(getSiteBaseUrl(ctx.req), access.agreement.id),
	};
}

async function resolveDirectDebitInviteRecipientEmail(
	admin: SupabaseClient,
	studentUserId: string,
): Promise<{ ok: false; response: Response } | { ok: true; recipient: string }> {
	const { data: profile } = await admin.from('profiles').select('email').eq('user_id', studentUserId).maybeSingle();
	const recipient = resolveDirectDebitInviteRecipient(profile?.email);
	if (!recipient) {
		const missingEmail = resolveDirectDebitInviteMissingEmailResponse();
		return { ok: false, response: jsonResponse(missingEmail.status, { error: missingEmail.error }) };
	}
	return { ok: true, recipient };
}

async function sendDirectDebitInviteMagicLink(
	prepared: Extract<DirectDebitInviteContext, { ok: true }>,
): Promise<Response> {
	const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
	const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
	const otpClient = createClient(supabaseUrl, anonKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
	const { error: otpErr } = await otpClient.auth.signInWithOtp({
		email: prepared.recipient,
		options: {
			emailRedirectTo: prepared.redirectTo,
			shouldCreateUser: false,
		},
	});
	if (otpErr) {
		console.error('signInWithOtp error', otpErr);
		return jsonResponse(502, { error: getSafeErrorMessage(otpErr) });
	}

	await prepared.admin.from('incasso_invitations').insert({
		lesson_agreement_id: prepared.agreement.id,
		recipient_email: prepared.recipient,
		sent_by: prepared.userId,
	});

	return jsonResponse(200, buildDirectDebitInviteSuccessPayload(prepared.recipient));
}

export async function handleSendDirectDebitInvite(ctx: LessonAgreementPostContext): Promise<Response> {
	const prepared = await prepareDirectDebitInvite(ctx);
	if (!prepared.ok) return prepared.response;
	return sendDirectDebitInviteMagicLink(prepared);
}
