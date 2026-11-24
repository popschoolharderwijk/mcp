import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { type SendTemplateEmailResult, sendTemplateEmail } from '../sendTemplateEmail.ts';
import {
	buildSignupConfirmationOptionDetails,
	buildSignupConfirmEmailVars,
	buildSignupConfirmUrl,
	buildSignupMailBaseVars,
	resolveSignupMailRecipientEmail,
	type SignupMailPersonFields,
} from './mailHelpers.ts';

async function loadSignupMailContext(
	supabase: SupabaseClient,
	body: SignupMailPersonFields & {
		lesson_type_id: string;
	},
	optionId: string | null,
): Promise<{
	lessonTypeName: string | null | undefined;
	optionDetails: ReturnType<typeof buildSignupConfirmationOptionDetails>;
	to: string;
}> {
	const { data: ltName } = await supabase
		.from('lesson_types')
		.select('name')
		.eq('id', body.lesson_type_id)
		.maybeSingle();

	let optionDetails = buildSignupConfirmationOptionDetails(null);
	if (optionId) {
		const { data: opt } = await supabase
			.from('lesson_type_options')
			.select('frequency, price_per_lesson')
			.eq('id', optionId)
			.maybeSingle();
		optionDetails = buildSignupConfirmationOptionDetails(opt);
	}

	return {
		lessonTypeName: ltName?.name,
		optionDetails,
		to: resolveSignupMailRecipientEmail(body),
	};
}

export async function sendSignupConfirmEmail(
	supabase: SupabaseClient,
	req: Request,
	body: SignupMailPersonFields & { lesson_type_id: string },
	optionId: string | null,
	siteUrl: string,
	rawToken: string,
): Promise<SendTemplateEmailResult> {
	const ctx = await loadSignupMailContext(supabase, body, optionId);
	return sendTemplateEmail({
		event_key: 'signup_confirm',
		to: ctx.to,
		vars: buildSignupConfirmEmailVars({
			body,
			lessonTypeName: ctx.lessonTypeName,
			optionDetails: ctx.optionDetails,
			confirmUrl: buildSignupConfirmUrl(siteUrl, rawToken),
		}),
		origin: req.headers.get('Origin'),
	});
}

export async function sendSignupReceivedEmail(
	supabase: SupabaseClient,
	req: Request,
	body: SignupMailPersonFields & { lesson_type_id: string },
	optionId: string | null,
): Promise<SendTemplateEmailResult> {
	const ctx = await loadSignupMailContext(supabase, body, optionId);
	return sendTemplateEmail({
		event_key: 'signup_received',
		to: ctx.to,
		vars: buildSignupMailBaseVars({
			body,
			lessonTypeName: ctx.lessonTypeName,
			optionDetails: ctx.optionDetails,
		}),
		origin: req.headers.get('Origin'),
	});
}
