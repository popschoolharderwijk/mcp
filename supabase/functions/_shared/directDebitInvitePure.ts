export function isDirectDebitInvitePrivilegedRole(role: string | null | undefined): boolean {
	return role === 'admin' || role === 'site_admin' || role === 'staff';
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

// ---------------------------------------------------------------------------
// Own invitation e-mail (template `direct_debit_invite`)
// ---------------------------------------------------------------------------

/**
 * Builds the login link in the token_hash format that /direct-debit/start consumes
 * (see src/lib/auth/magicLink.ts). Mail scanners only fetch the page; the hash is never
 * sent to a server, so the one-time token is not consumed in advance.
 */
export function buildDirectDebitInviteLink(redirectTo: string, hashedToken: string): string {
	return `${redirectTo}#token_hash=${encodeURIComponent(hashedToken)}&type=email`;
}

export interface InviteRecipientNameInput {
	studentName: string;
	parentName: string | null | undefined;
	debtorName: string | null | undefined;
	debtorSameAsStudent: boolean | null | undefined;
}

/** Parent first, then a separate debtor, otherwise the student. */
export function resolveInviteRecipientName(input: InviteRecipientNameInput): string {
	const parent = input.parentName?.trim();
	if (parent) return parent;
	const debtor = input.debtorName?.trim();
	if (debtor && input.debtorSameAsStudent === false) return debtor;
	return input.studentName;
}

export function formatInviteName(firstName: string | null | undefined, lastName: string | null | undefined): string {
	return [firstName, lastName].filter((p) => p?.trim()).join(' ') || 'leerling';
}

const FREQUENCY_NL: Record<string, string> = {
	daily: 'dagelijks',
	weekly: 'wekelijks',
	biweekly: 'tweewekelijks',
	monthly: 'maandelijks',
};

/** "Gitaarles (30 min, wekelijks)" or "Popkoor (60 min, wekelijks, 18+)". */
export function formatInviteLessonForm(
	typeName: string,
	option: { duration_minutes: number; frequency: string; label: string | null } | null,
): string {
	if (!option) return typeName;
	const parts = [`${option.duration_minutes} min`, FREQUENCY_NL[option.frequency] ?? option.frequency];
	if (option.label) parts.push(option.label);
	return `${typeName} (${parts.join(', ')})`;
}

/** € 1.234,56 (nl-NL). */
export function formatInviteCents(cents: number): string {
	const abs = Math.abs(cents);
	const euros = Math.floor(abs / 100)
		.toString()
		.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
	const rest = String(abs % 100).padStart(2, '0');
	return `€ ${cents < 0 ? '-' : ''}${euros},${rest}`;
}

/** YYYY-MM-DD → DD-MM-YYYY. */
export function formatInviteDate(date: string | null | undefined): string {
	if (!date) return '';
	const [y, m, d] = date.slice(0, 10).split('-');
	return `${d}-${m}-${y}`;
}

/** Months to preview: the start month and the next billable month (never August). */
export function resolveInviteFeeMonths(startDate: string): [string, string] {
	const [y, m] = startDate.split('-').map(Number);
	let year = y;
	let month = m + 1;
	if (month > 12) {
		month = 1;
		year += 1;
	}
	if (month === 8) month = 9;
	return [`${startDate.slice(0, 7)}-01`, `${year}-${String(month).padStart(2, '0')}-01`];
}

export interface InviteFee {
	amount_cents: number;
	btw_rate: number;
	btw_amount_cents: number;
	is_prorated: boolean;
}

/** "€ 88,79 (incl. € 15,41 btw)" or "€ 73,38 (vrijgesteld van btw)". */
export function formatInviteFeeAmount(fee: InviteFee): string {
	if (fee.btw_rate === 21) {
		return `${formatInviteCents(fee.amount_cents)} (incl. ${formatInviteCents(fee.btw_amount_cents)} btw)`;
	}
	return `${formatInviteCents(fee.amount_cents)} (vrijgesteld van btw)`;
}

/** The pro-rata first month is only shown when it is pro rata and differs from the monthly amount. */
export function shouldShowFirstMonth(first: InviteFee, regular: InviteFee): boolean {
	return first.is_prorated && first.amount_cents !== regular.amount_cents;
}

export function buildFirstMonthLine(first: InviteFee, regular: InviteFee): string {
	if (!shouldShowFirstMonth(first, regular)) return '';
	return `<li>Start je halverwege de maand, dan betaal je de eerste maand naar rato: ${formatInviteCents(first.amount_cents)}.</li>`;
}

export interface DirectDebitInviteVarsInput {
	studentName: string;
	recipientName: string;
	lessonForm: string;
	firstFee: InviteFee;
	regularFee: InviteFee;
	startDate: string;
	minimumTermEnd: string | null;
	link: string;
}

export function buildDirectDebitInviteVars(input: DirectDebitInviteVarsInput): Record<string, string> {
	const showFirst = shouldShowFirstMonth(input.firstFee, input.regularFee);
	return {
		leerling_naam: input.studentName,
		ontvanger_naam: input.recipientName,
		les_type: input.lessonForm,
		bedrag: formatInviteFeeAmount(input.regularFee),
		eerste_maand_bedrag: showFirst ? formatInviteCents(input.firstFee.amount_cents) : '',
		eerste_maand_regel: buildFirstMonthLine(input.firstFee, input.regularFee),
		startdatum: formatInviteDate(input.startDate),
		minimale_looptijd_tot: formatInviteDate(input.minimumTermEnd),
		link: input.link,
	};
}
