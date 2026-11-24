import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendSignupReceivedEmail } from '../_shared/signup/mail.ts';
import { hashUrlToken } from '../_shared/tokenCryptoHelpers.ts';
import {
	buildConfirmSuccessResponse,
	parseConfirmRequestBody,
	readConfirmServiceEnv,
	resolveConfirmInvalidTokenResponse,
	resolveConfirmMethodResponse,
	resolveConfirmUpdateResult,
} from './confirmSignupRequestHelpers.ts';

type ConfirmedSignupRow = {
	id: string;
	lesson_type_id: string;
	lesson_type_option_id: string | null;
	first_name: string;
	last_name: string;
	email: string;
	parent_email: string | null;
};

async function loadConfirmedSignupRow(
	supabase: ReturnType<typeof createClient>,
	token: string,
): Promise<{ ok: true; row: ConfirmedSignupRow } | { ok: false; response: Response }> {
	const tokenHash = await hashUrlToken(token);
	const { data, error } = await supabase
		.from('lesson_signup_requests')
		.update({
			status: 'pending',
			confirmation_token_hash: null,
			confirmation_expires_at: null,
		})
		.eq('confirmation_token_hash', tokenHash)
		.eq('status', 'awaiting_confirmation')
		.gt('confirmation_expires_at', new Date().toISOString())
		.select('id, lesson_type_id, lesson_type_option_id, first_name, last_name, email, parent_email')
		.maybeSingle();

	const outcome = resolveConfirmUpdateResult(error, data as ConfirmedSignupRow | null);
	if (!outcome.ok) {
		if (outcome.logError) console.error('confirm signup update error', error);
		return { ok: false, response: resolveConfirmInvalidTokenResponse() };
	}
	return { ok: true, row: outcome.row };
}

async function sendConfirmReceivedMail(
	supabase: ReturnType<typeof createClient>,
	req: Request,
	row: ConfirmedSignupRow,
): Promise<boolean> {
	const mail = await sendSignupReceivedEmail(
		supabase,
		req,
		{
			first_name: row.first_name,
			last_name: row.last_name,
			email: row.email,
			parent_email: row.parent_email,
			lesson_type_id: row.lesson_type_id,
		},
		row.lesson_type_option_id,
	);
	if (!mail.ok) {
		console.error('signup_received mail failed after confirm', mail);
		return false;
	}
	return true;
}

export async function handleConfirmSignupRequest(req: Request): Promise<Response> {
	const methodResponse = resolveConfirmMethodResponse(req.method);
	if (methodResponse) return methodResponse;

	const parsed = await parseConfirmRequestBody(req);
	if (!parsed.ok) return parsed.response;

	const env = readConfirmServiceEnv((key) => Deno.env.get(key));
	const supabase = createClient(env.supabaseUrl, env.serviceKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});

	const confirmed = await loadConfirmedSignupRow(supabase, parsed.token);
	if (!confirmed.ok) return confirmed.response;

	const mailSent = await sendConfirmReceivedMail(supabase, req, confirmed.row);
	return buildConfirmSuccessResponse(mailSent);
}
