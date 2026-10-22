// Edge mirror of PRIMARY_HEX in src/lib/color/brand-hex.ts — keep mail header in sync; see invoiceHelpers.test.ts

import { ageAtDate, DEFAULT_VAT_AGE_THRESHOLD_YEARS, DEFAULT_VAT_STANDARD_RATE_PERCENT } from './format.ts';
import type {
	BatchItem,
	DirectDebitBatch,
	InvoiceLine,
	InvoiceTotals,
	ProfileRow,
	StudentInfo,
	StudentRow,
} from './types.ts';

/** Mail HTML header background; bootstrap default — load branding.primary_hex from app_settings at IO boundary when available. */
export const INVOICE_MAIL_PRIMARY_HEX = '#c4ab7c';

export interface InvoiceVatSettings {
	ageThresholdYears: number;
	standardRatePercent: number;
}

export const DEFAULT_INVOICE_VAT_SETTINGS: InvoiceVatSettings = {
	ageThresholdYears: DEFAULT_VAT_AGE_THRESHOLD_YEARS,
	standardRatePercent: DEFAULT_VAT_STANDARD_RATE_PERCENT,
};

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

export function buildInvoiceLines(
	studentItems: BatchItem[],
	student: StudentInfo,
	collectionDate: string,
	vat: InvoiceVatSettings = DEFAULT_INVOICE_VAT_SETTINGS,
): InvoiceLine[] {
	return studentItems.map((item) => {
		const cat = ageAtDate(student.date_of_birth, collectionDate, vat.ageThresholdYears);
		const total = item.amount_cents;
		const isAdult = cat === 'adult';
		const rate = isAdult ? vat.standardRatePercent : 0;
		const divisor = 1 + rate / 100;
		const excl = isAdult ? Math.round(total / divisor) : total;
		const vatAmt = isAdult ? total - excl : 0;

		return {
			batch_item_id: item.id,
			description: item.remittance_info,
			lesson_date: collectionDate,
			quantity: 1,
			unit_price_cents: total,
			vat_rate: rate,
			amount_excl_vat_cents: excl,
			vat_amount_cents: vatAmt,
			amount_total_cents: total,
		};
	});
}

export function computeTotals(lines: InvoiceLine[]): InvoiceTotals {
	return lines.reduce(
		(acc, line) => {
			acc.excl += line.amount_excl_vat_cents;
			if (line.vat_rate > 0) acc.vat21 += line.vat_amount_cents;
			if (line.vat_rate === 0) acc.vat0 += line.amount_excl_vat_cents;
			acc.total += line.amount_total_cents;
			return acc;
		},
		{ excl: 0, vat21: 0, vat0: 0, total: 0 },
	);
}

export function resolveStandardVatRateFromLines(lines: InvoiceLine[]): number {
	const rated = lines.find((line) => line.vat_rate > 0);
	return rated?.vat_rate ?? DEFAULT_VAT_STANDARD_RATE_PERCENT;
}

export function resolveAgeCategory(
	lines: InvoiceLine[],
	dateOfBirth: string | null,
	collectionDate: string,
	ageThresholdYears: number = DEFAULT_VAT_AGE_THRESHOLD_YEARS,
): string {
	// Missing date of birth is billed at 0%. ageAtDate still returns unknown, and that category
	// is what the report uses to keep this revenue in its own total.
	const lineAges = lines.map(() => ageAtDate(dateOfBirth, collectionDate, ageThresholdYears));
	if (lineAges.length > 0 && lineAges.every((age) => age === 'unknown')) return 'unknown';

	const hasVat = lines.some((l) => l.vat_rate > 0);
	const hasExempt = lines.some((l) => l.vat_rate === 0);
	if (hasVat && hasExempt) return 'mixed';
	if (hasVat) return 'adult';
	if (hasExempt) return 'youth';
	return 'unknown';
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
<div style="background:${INVOICE_MAIL_PRIMARY_HEX};padding:18px 24px;color:#fff;font-weight:700;font-size:18px">${args.companyName}</div>
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
	const companyName = args.settings.company_name?.trim() || '—';
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
