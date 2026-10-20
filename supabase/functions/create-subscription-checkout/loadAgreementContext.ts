import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/http.ts';
import {
	readBillingKind,
	resolveNotStripeAgreementFailure,
	resolveOneOffAgreementFailure,
} from '../_shared/paymentMethodPure.ts';
import { resolveAgreementPreProfileFailure, resolveAgreementProfileFailure } from './loadAgreementContextPure.ts';
import type { AgreementRow, ProfileRow } from './types.ts';

export async function loadAgreementContext(
	userClient: SupabaseClient,
	admin: SupabaseClient,
	lessonAgreementId: string,
): Promise<
	| { ok: true; agreement: AgreementRow; profile: ProfileRow; billingUserId: string }
	| { ok: false; response: Response }
> {
	const { data: agreement, error: agreementErr } = await userClient
		.from('lesson_agreements')
		.select('id, student_user_id, is_active, payment_method, lesson_type_options(billing_kind)')
		.eq('id', lessonAgreementId)
		.maybeSingle();

	const preProfileFailure = resolveAgreementPreProfileFailure(
		agreement as AgreementRow | null,
		agreementErr?.message,
	);
	if (preProfileFailure)
		return { ok: false, response: jsonResponse(preProfileFailure.status, { error: preProfileFailure.error }) };

	const notStripe = resolveNotStripeAgreementFailure((agreement as AgreementRow).payment_method);
	if (notStripe) return { ok: false, response: jsonResponse(notStripe.status, { error: notStripe.error }) };
	const oneOff = resolveOneOffAgreementFailure(
		readBillingKind((agreement as { lesson_type_options?: unknown }).lesson_type_options),
	);
	if (oneOff) return { ok: false, response: jsonResponse(oneOff.status, { error: oneOff.error }) };

	const billingUserId = (agreement as AgreementRow).student_user_id;
	const { data: profile } = await admin
		.from('profiles')
		.select('email, first_name, last_name')
		.eq('user_id', billingUserId)
		.maybeSingle();

	const profileFailure = resolveAgreementProfileFailure(profile as ProfileRow | null);
	if (profileFailure)
		return { ok: false, response: jsonResponse(profileFailure.status, { error: profileFailure.error }) };

	return { ok: true, agreement: agreement as AgreementRow, profile: profile as ProfileRow, billingUserId };
}
