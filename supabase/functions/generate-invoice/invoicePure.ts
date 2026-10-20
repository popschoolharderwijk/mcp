// Edge mirror of PRIMARY_HEX in src/lib/color/brand-hex.ts — keep mail header in sync; see invoicePure.test.ts

import type {
	BatchItem,
	DirectDebitBatch,
	InvoiceLine,
	InvoiceTotals,
	ProfileRow,
	StudentInfo,
	StudentRow,
} from './types.ts';

/** Mail HTML header background; must match src/lib/color/brand-hex.ts PRIMARY_HEX */
export const INVOICE_MAIL_PRIMARY_HEX = '#c4ab7c';

export function buildStudentInfo(sid: string, profile: ProfileRow, stRow: StudentRow | undefined): StudentInfo {
	return {
		user_id: sid,
		first_name: profile.first_name,
		last_name: profile.last_name,
		email: profile.email,
		date_of_birth: stRow?.date_of_birth ?? null,
		parent_email: stRow?.parent_email ?? null,
		parent_name: stRow?.parent_name ?? null,
		debtor_name: stRow?.debtor_name ?? null,
		debtor_address: stRow?.debtor_address ?? null,
		debtor_postal_code: stRow?.debtor_postal_code ?? null,
		debtor_city: stRow?.debtor_city ?? null,
		debtor_info_same_as_student: stRow?.debtor_info_same_as_student ?? true,
	};
}

/** True when every item carries the VAT breakdown from the fee rules. */
export function hasVatBreakdown(items: BatchItem[]): boolean {
	return items.every(
		(item) => item.btw_rate != null && item.amount_excl_btw_cents != null && item.btw_amount_cents != null,
	);
}

/** Invoice lines copy the VAT breakdown of the batch items; no fee or VAT is computed here. */
export function buildInvoiceLines(studentItems: BatchItem[], collectionDate: string): InvoiceLine[] {
	return studentItems.map((item) => ({
		batch_item_id: item.id,
		description: item.remittance_info,
		lesson_date: collectionDate,
		quantity: 1,
		unit_price_cents: item.amount_cents,
		btw_rate: item.btw_rate ?? 0,
		amount_excl_btw_cents: item.amount_excl_btw_cents ?? item.amount_cents,
		btw_amount_cents: item.btw_amount_cents ?? 0,
		amount_total_cents: item.amount_cents,
	}));
}

export function computeTotals(lines: InvoiceLine[]): InvoiceTotals {
	return lines.reduce(
		(acc, line) => {
			acc.excl += line.amount_excl_btw_cents;
			if (line.btw_rate === 21) acc.btw21 += line.btw_amount_cents;
			if (line.btw_rate === 0) acc.btw0 += line.amount_excl_btw_cents;
			acc.total += line.amount_total_cents;
			return acc;
		},
		{ excl: 0, btw21: 0, btw0: 0, total: 0 },
	);
}

export function resolveAgeCategory(items: BatchItem[]): string {
	const categories = new Set(items.map((item) => item.age_category ?? 'unknown'));
	if (categories.size === 1) return [...categories][0];
	if (categories.has('unknown')) return 'unknown';
	return 'mixed';
}

export function filterStudentItems(items: BatchItem[], studentUserId: string): BatchItem[] {
	return items.filter((item) => item.student_user_id === studentUserId);
}

export function computeDueDate(paymentTermDays: number | undefined): string {
	const days = paymentTermDays ?? 14;
	return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

export function getCollectionDate(batch: DirectDebitBatch): string {
	return batch.collection_date;
}

export function resolveInvoiceEmailRecipient(student: {
	parent_email: string | null;
	email: string | null;
}): string | null {
	return student.parent_email || student.email;
}

export function buildInvoicePaymentNote(
	dueDate: string,
	mandateRef: string | null,
	formatDueDate: (iso: string) => string,
): string {
	if (mandateRef) {
		return `<p>Dit bedrag wordt automatisch geïncasseerd op of rond ${formatDueDate(dueDate)} via SEPA-mandaat ${mandateRef}.</p>`;
	}
	return `<p>Gelieve het bedrag te voldoen vóór ${formatDueDate(dueDate)}.</p>`;
}

export function buildInvoiceEmailSubject(invoiceNumber: string, companyName: string): string {
	return `Factuur ${invoiceNumber} – ${companyName}`;
}

export function buildInvoiceEmailHtml(args: {
	firstName: string | null;
	invoiceNumber: string;
	totalFormatted: string;
	paymentNote: string;
	companyName: string;
}): string {
	return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
<div style="background:${INVOICE_MAIL_PRIMARY_HEX};padding:18px 24px;color:#fff;font-weight:700;font-size:18px">popschool harderwijk</div>
<div style="padding:24px;background:#fff;color:#111">
<p>Beste ${args.firstName ?? 'leerling'},</p>
<p>Hierbij ontvang je factuur <strong>${args.invoiceNumber}</strong> ten bedrage van <strong>${args.totalFormatted}</strong>.</p>
${args.paymentNote}
<p>De factuur is als PDF bijgevoegd. Je kunt 'm ook altijd terugvinden via "Mijn facturen" in het portaal.</p>
<p style="color:#666;font-size:13px;margin-top:24px">Met vriendelijke groet,<br/>${args.companyName}</p>
</div></div>`;
}

export function canSendInvoiceEmail(
	recipient: string | null,
	resendKey: string,
	fromEmail: string,
): recipient is string {
	return Boolean(recipient && resendKey && fromEmail);
}

export function buildResendInvoiceEmailPayload(args: {
	fromEmail: string;
	recipient: string;
	subject: string;
	html: string;
	invoiceNumber: string;
	pdfBase64: string;
}) {
	return {
		from: args.fromEmail,
		to: [args.recipient],
		subject: args.subject,
		html: args.html,
		attachments: [{ filename: `${args.invoiceNumber}.pdf`, content: args.pdfBase64 }],
	};
}

export function buildInvoiceEmailDeliveryContent(args: {
	student: { first_name: string | null; email: string | null; parent_email: string | null };
	invoiceNumber: string;
	totals: { total: number };
	dueDate: string;
	mandateRef: string | null;
	settings: { company_name?: string | null };
	formatDate: (value: string) => string;
	formatCurrency: (cents: number) => string;
}) {
	const recipient = resolveInvoiceEmailRecipient(args.student);
	const companyName = args.settings.company_name ?? 'popschool harderwijk';
	const paymentNote = buildInvoicePaymentNote(args.dueDate, args.mandateRef, args.formatDate);
	const html = buildInvoiceEmailHtml({
		firstName: args.student.first_name,
		invoiceNumber: args.invoiceNumber,
		totalFormatted: args.formatCurrency(args.totals.total),
		paymentNote,
		companyName,
	});
	const subject = buildInvoiceEmailSubject(args.invoiceNumber, companyName);
	return { recipient, companyName, html, subject };
}

export function shouldRecordInvoiceEmailSent(responseOk: boolean): boolean {
	return responseOk;
}

export interface InvoiceMailEnvConfig {
	resendKey: string;
	fromEmail: string;
}

export function readInvoiceMailEnv(getEnv: (key: string) => string | undefined): InvoiceMailEnvConfig {
	return {
		resendKey: getEnv('RESEND_API_KEY_TRANSACTIONAL') ?? '',
		fromEmail: getEnv('RESEND_FROM_EMAIL') ?? '',
	};
}

export function stripBearerToken(authHeader: string): string {
	return authHeader.replace(/^Bearer\s+/i, '');
}

export function isServiceRoleToken(token: string, serviceKey: string): boolean {
	return token === serviceKey;
}

export function hasAdminRole(roles: Array<{ role: string }> | null | undefined): boolean {
	return (roles ?? []).some((role) => role.role === 'admin' || role.role === 'site_admin');
}
