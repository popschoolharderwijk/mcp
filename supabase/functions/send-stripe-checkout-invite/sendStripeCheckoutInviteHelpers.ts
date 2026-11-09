export function isStripeCheckoutInvitePrivilegedRole(role: string | null | undefined): boolean {
	return role === 'admin' || role === 'site_admin' || role === 'teacher';
}

export function canAccessStripeCheckoutInviteAgreement(
	isPrivileged: boolean,
	agreementStudentUserId: string,
	requestingUserId: string,
): boolean {
	return isPrivileged || agreementStudentUserId === requestingUserId;
}

export function buildStripeCheckoutInviteRedirectUrl(siteUrl: string, agreementId: string): string {
	return `${siteUrl}/stripe/checkout/start?agreement=${agreementId}`;
}

export function resolveStripeCheckoutInviteRecipient(profileEmail: string | null | undefined): string | null {
	return profileEmail ?? null;
}

export function resolveStripeCheckoutAgreementNotFoundResponse(): { status: 404; error: string } {
	return { status: 404, error: 'Overeenkomst niet gevonden' };
}

export function resolveStripeCheckoutAgreementInactiveResponse(): { status: 409; error: string } {
	return { status: 409, error: 'Overeenkomst is niet actief' };
}

export function resolveStripeCheckoutInviteForbiddenResponse(): { status: 403; error: string } {
	return { status: 403, error: 'Geen rechten' };
}

export function resolveStripeCheckoutInviteMissingEmailResponse(): { status: 422; error: string } {
	return { status: 422, error: 'Geen e-mailadres bekend voor leerling' };
}

export function buildStripeCheckoutInviteSuccessPayload(recipient: string): { ok: true; recipient: string } {
	return { ok: true, recipient };
}

export function hasStripeCheckoutAgreementRecord(
	agreement: { id: string; student_user_id: string; is_active: boolean } | null,
	error: unknown,
): agreement is { id: string; student_user_id: string; is_active: boolean } {
	return Boolean(agreement) && !error;
}

export function resolveStripeCheckoutAgreementAccessError(
	agreement: { id: string; is_active: boolean; student_user_id: string } | null,
	error: unknown,
	isPrivileged: boolean,
	userId: string,
):
	| { ok: false; status: number; error: string }
	| { ok: true; agreement: { id: string; is_active: boolean; student_user_id: string } } {
	if (!hasStripeCheckoutAgreementRecord(agreement, error)) {
		const notFound = resolveStripeCheckoutAgreementNotFoundResponse();
		return { ok: false, status: notFound.status, error: notFound.error };
	}
	if (!agreement.is_active) {
		const inactive = resolveStripeCheckoutAgreementInactiveResponse();
		return { ok: false, status: inactive.status, error: inactive.error };
	}
	if (!canAccessStripeCheckoutInviteAgreement(isPrivileged, agreement.student_user_id, userId)) {
		const forbidden = resolveStripeCheckoutInviteForbiddenResponse();
		return { ok: false, status: forbidden.status, error: forbidden.error };
	}
	return { ok: true, agreement };
}
