export function isStripeCheckoutInviteAdminRole(role: string | null | undefined): boolean {
	return role === 'admin' || role === 'site_admin';
}

/** Admin/site_admin only — teachers must match agreement.teacher_user_id. */
export function isStripeCheckoutInvitePrivilegedRole(role: string | null | undefined): boolean {
	return isStripeCheckoutInviteAdminRole(role);
}

export function canAccessStripeCheckoutInviteAgreement(input: {
	isAdmin: boolean;
	agreementStudentUserId: string;
	agreementTeacherUserId: string;
	requestingUserId: string;
}): boolean {
	return (
		input.isAdmin ||
		input.agreementStudentUserId === input.requestingUserId ||
		input.agreementTeacherUserId === input.requestingUserId
	);
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

export type StripeCheckoutInviteAgreement = {
	id: string;
	student_user_id: string;
	teacher_user_id: string;
	is_active: boolean;
};

export function hasStripeCheckoutAgreementRecord(
	agreement: StripeCheckoutInviteAgreement | null,
	error: unknown,
): agreement is StripeCheckoutInviteAgreement {
	return Boolean(agreement) && !error;
}

export function resolveStripeCheckoutAgreementAccessError(
	agreement: StripeCheckoutInviteAgreement | null,
	error: unknown,
	isAdmin: boolean,
	userId: string,
): { ok: false; status: number; error: string } | { ok: true; agreement: StripeCheckoutInviteAgreement } {
	if (!hasStripeCheckoutAgreementRecord(agreement, error)) {
		const notFound = resolveStripeCheckoutAgreementNotFoundResponse();
		return { ok: false, status: notFound.status, error: notFound.error };
	}
	if (!agreement.is_active) {
		const inactive = resolveStripeCheckoutAgreementInactiveResponse();
		return { ok: false, status: inactive.status, error: inactive.error };
	}
	if (
		!canAccessStripeCheckoutInviteAgreement({
			isAdmin,
			agreementStudentUserId: agreement.student_user_id,
			agreementTeacherUserId: agreement.teacher_user_id,
			requestingUserId: userId,
		})
	) {
		const forbidden = resolveStripeCheckoutInviteForbiddenResponse();
		return { ok: false, status: forbidden.status, error: forbidden.error };
	}
	return { ok: true, agreement };
}

/** Recipient override: admin, or the teacher on this agreement. */
export function canOverrideStripeCheckoutInviteRecipient(
	isAdmin: boolean,
	agreementTeacherUserId: string,
	requestingUserId: string,
): boolean {
	return isAdmin || agreementTeacherUserId === requestingUserId;
}
