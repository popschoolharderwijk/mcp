import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendTemplateEmail } from '../_shared/sendTemplateEmail.ts';
import {
	buildSignupConfirmationEmailVars,
	buildSignupConfirmationOptionDetails,
	resolveSignupConfirmationRecipientEmail,
} from './sendConfirmationEmailPure.ts';
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
		const [{ data: opt }, { data: tariff }] = await Promise.all([
			supabase.from('lesson_type_options').select('frequency, billing_kind').eq('id', optionId).maybeSingle(),
			supabase
				.from('lesson_type_option_tariffs')
				.select('amount_under_21_cents, amount_adult_cents')
				.eq('lesson_type_option_id', optionId)
				.lte('effective_from', new Date().toISOString().slice(0, 10))
				.order('effective_from', { ascending: false })
				.limit(1)
				.maybeSingle(),
		]);
		optionDetails = buildSignupConfirmationOptionDetails(opt, tariff);
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
