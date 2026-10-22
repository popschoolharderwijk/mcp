import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendTemplateEmail } from '../_shared/sendTemplateEmail.ts';
import {
	buildSignupConfirmationEmailVars,
	buildSignupConfirmationOptionDetails,
	resolveSignupConfirmationRecipientEmail,
} from './sendConfirmationEmailHelpers.ts';
import type { SignupRequest } from './types.ts';

export async function sendSignupConfirmationEmail(
	supabase: SupabaseClient,
	req: Request,
	body: SignupRequest,
	optionId: string | null,
): Promise<void> {
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

	await sendTemplateEmail({
		event_key: 'signup_received',
		to: resolveSignupConfirmationRecipientEmail(body),
		vars: buildSignupConfirmationEmailVars({
			body,
			lessonTypeName: ltName?.name,
			optionDetails,
		}),
		origin: req.headers.get('Origin'),
	});
}
