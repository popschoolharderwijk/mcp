import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
	buildSepaMandateInsertPayload,
	hasSepaMandateReferenceFailure,
	shouldProceedWithSepaMandateCreate,
} from './ensureStudentFromSignupHelpers.ts';
import type { SignupRequestRow } from './types.ts';

async function insertSignupSepaMandate(
	admin: SupabaseClient,
	studentUserId: string,
	reqRow: SignupRequestRow,
): Promise<void> {
	const { data: refData, error: refErr } = await admin.rpc('next_mandate_reference');
	if (hasSepaMandateReferenceFailure(refErr, refData as string | null)) {
		console.error('next_mandate_reference error', refErr);
		return;
	}

	const { error: mandateErr } = await admin
		.from('sepa_mandates')
		.insert(
			buildSepaMandateInsertPayload(
				studentUserId,
				reqRow,
				refData as string,
				new Date().toISOString().slice(0, 10),
			),
		);
	if (mandateErr) console.error('sepa_mandates insert error', mandateErr);
}

export async function ensureSepaMandate(
	admin: SupabaseClient,
	studentUserId: string,
	reqRow: SignupRequestRow,
): Promise<void> {
	const { data: existingMandate } = await admin
		.from('sepa_mandates')
		.select('id')
		.eq('student_user_id', studentUserId)
		.eq('iban', reqRow.sepa_iban)
		.maybeSingle();
	if (!shouldProceedWithSepaMandateCreate(reqRow, existingMandate)) return;

	await insertSignupSepaMandate(admin, studentUserId, reqRow);
}
