import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/http.ts';
import {
	buildGroupSignupApprovalUpdate,
	resolveCreatedAgreementId,
	resolveMemberInsertFailure,
} from './enrollGroupSignupPure.ts';
import type { SignupRequestRow } from './types.ts';

async function insertGroupMember(
	admin: SupabaseClient,
	targetGroupId: string,
	studentUserId: string,
): Promise<{ ok: true } | { ok: false; response: Response }> {
	const { error: memberErr } = await admin.from('lesson_group_members').insert({
		lesson_group_id: targetGroupId,
		student_user_id: studentUserId,
	});
	const memberFailure = resolveMemberInsertFailure(memberErr?.message);
	if (memberFailure) {
		console.error('member insert error', memberErr);
		return { ok: false, response: jsonResponse(memberFailure.status, { error: memberFailure.error }) };
	}
	return { ok: true };
}

async function loadActiveAgreementId(
	admin: SupabaseClient,
	targetGroupId: string,
	studentUserId: string,
): Promise<string | null> {
	const { data: agreement } = await admin
		.from('lesson_agreements')
		.select('id')
		.eq('lesson_group_id', targetGroupId)
		.eq('student_user_id', studentUserId)
		.eq('is_active', true)
		.maybeSingle();
	return resolveCreatedAgreementId(agreement);
}

export async function enrollGroupSignup(
	admin: SupabaseClient,
	args: {
		reqRow: SignupRequestRow;
		studentUserId: string;
		targetGroupId: string;
		processedBy: string;
	},
): Promise<{ ok: true; createdAgreementId: string | null; isNew: boolean } | { ok: false; response: Response }> {
	const priorId = await loadActiveAgreementId(admin, args.targetGroupId, args.studentUserId);
	const memberResult = await insertGroupMember(admin, args.targetGroupId, args.studentUserId);
	if (!memberResult.ok) return memberResult;

	const createdAgreementId = await loadActiveAgreementId(admin, args.targetGroupId, args.studentUserId);

	if (createdAgreementId && !priorId) {
		const { error } = await admin
			.from('lesson_agreements')
			.update({ payment_method: args.reqRow.payment_method ?? 'stripe', sepa_mandate_id: null })
			.eq('id', createdAgreementId);
		if (error) return { ok: false, response: jsonResponse(500, { error: 'Kon de betaalmethode niet opslaan' }) };
	}
	await admin
		.from('lesson_signup_requests')
		.update(
			buildGroupSignupApprovalUpdate({
				processedBy: args.processedBy,
				processedAt: new Date().toISOString(),
				createdAgreementId,
				targetGroupId: args.targetGroupId,
			}),
		)
		.eq('id', args.reqRow.id);

	return { ok: true, createdAgreementId, isNew: !priorId };
}
