export function resolveTargetGroupId(
	overrideLessonGroupId: string | null | undefined,
	requestLessonGroupId: string | null,
): string | null {
	return overrideLessonGroupId ?? requestLessonGroupId;
}

export function resolveApproveSignupStatus(targetGroupId: string | null): 'approved' | 'pending' {
	return targetGroupId ? 'approved' : 'pending';
}

export function buildApproveSignupSuccessPayload(args: {
	studentUserId: string;
	createdAgreementId: string | null;
	targetGroupId: string | null;
}) {
	return {
		student_user_id: args.studentUserId,
		created_agreement_id: args.createdAgreementId,
		status: resolveApproveSignupStatus(args.targetGroupId),
	};
}
