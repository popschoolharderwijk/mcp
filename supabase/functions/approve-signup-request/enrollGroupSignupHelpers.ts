export function isDuplicateMemberInsertError(message: string | undefined): boolean {
	return Boolean(message?.includes('duplicate'));
}

export function resolveMemberInsertFailure(errorMessage: string | undefined): { status: number; error: string } | null {
	if (errorMessage && !isDuplicateMemberInsertError(errorMessage)) {
		return { status: 500, error: 'Kon leerling niet aan groep toevoegen' };
	}
	return null;
}

export function resolveCreatedAgreementId(agreement: { id: string } | null | undefined): string | null {
	return agreement?.id ?? null;
}

export function buildGroupSignupApprovalUpdate(args: {
	processedBy: string;
	processedAt: string;
	createdAgreementId: string | null;
	targetGroupId: string;
}) {
	return {
		status: 'approved' as const,
		processed_by: args.processedBy,
		processed_at: args.processedAt,
		created_agreement_id: args.createdAgreementId,
		lesson_group_id: args.targetGroupId,
	};
}
