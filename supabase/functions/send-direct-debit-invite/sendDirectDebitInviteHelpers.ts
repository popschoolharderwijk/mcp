export function isDirectDebitInvitePrivilegedRole(role: string | null | undefined): boolean {
	return role === 'admin' || role === 'site_admin' || role === 'teacher';
}

export function canAccessDirectDebitInviteAgreement(
	isPrivileged: boolean,
	agreementStudentUserId: string,
	requestingUserId: string,
): boolean {
	return isPrivileged || agreementStudentUserId === requestingUserId;
}

export function buildDirectDebitInviteRedirectUrl(siteUrl: string, agreementId: string): string {
	return `${siteUrl}/direct-debit/start?agreement=${agreementId}`;
}

export function resolveDirectDebitInviteRecipient(profileEmail: string | null | undefined): string | null {
	return profileEmail ?? null;
}

export function resolveDirectDebitAgreementNotFoundResponse(): { status: 404; error: string } {
	return { status: 404, error: 'Overeenkomst niet gevonden' };
}

export function resolveDirectDebitAgreementInactiveResponse(): { status: 409; error: string } {
	return { status: 409, error: 'Overeenkomst is niet actief' };
}

export function resolveDirectDebitInviteForbiddenResponse(): { status: 403; error: string } {
	return { status: 403, error: 'Geen rechten' };
}

export function resolveDirectDebitInviteMissingEmailResponse(): { status: 422; error: string } {
	return { status: 422, error: 'Geen e-mailadres bekend voor leerling' };
}

export function buildDirectDebitInviteSuccessPayload(recipient: string): { ok: true; recipient: string } {
	return { ok: true, recipient };
}

export function hasDirectDebitAgreementRecord(
	agreement: { id: string; student_user_id: string; is_active: boolean } | null,
	error: unknown,
): agreement is { id: string; student_user_id: string; is_active: boolean } {
	return Boolean(agreement) && !error;
}

export function resolveDirectDebitAgreementAccessError(
	agreement: { id: string; is_active: boolean; student_user_id: string } | null,
	error: unknown,
	isPrivileged: boolean,
	userId: string,
):
	| { ok: false; status: number; error: string }
	| { ok: true; agreement: { id: string; is_active: boolean; student_user_id: string } } {
	if (!hasDirectDebitAgreementRecord(agreement, error)) {
		const notFound = resolveDirectDebitAgreementNotFoundResponse();
		return { ok: false, status: notFound.status, error: notFound.error };
	}
	if (!agreement.is_active) {
		const inactive = resolveDirectDebitAgreementInactiveResponse();
		return { ok: false, status: inactive.status, error: inactive.error };
	}
	if (!canAccessDirectDebitInviteAgreement(isPrivileged, agreement.student_user_id, userId)) {
		const forbidden = resolveDirectDebitInviteForbiddenResponse();
		return { ok: false, status: forbidden.status, error: forbidden.error };
	}
	return { ok: true, agreement };
}
