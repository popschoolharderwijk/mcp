import {
	buildInvoiceLines,
	buildStudentInfo,
	computeTotals,
	filterStudentItems,
	resolveAgeCategory,
} from './invoicePure.ts';
import type { BatchItem, InvoiceLine, InvoiceTotals, ProfileRow, StudentInvoiceResult, StudentRow } from './types.ts';

export function buildInvoiceStoragePath(studentUserId: string, invoiceId: string): string {
	return `${studentUserId}/${invoiceId}.pdf`;
}

export function buildSkippedStudentInvoiceResult(
	studentUserId: string,
	existing: { id: string; invoice_number: string },
): StudentInvoiceResult {
	return {
		student_user_id: studentUserId,
		invoice_id: existing.id,
		invoice_number: existing.invoice_number,
		skipped: true,
	};
}

export function buildMissingProfileInvoiceResult(studentUserId: string): StudentInvoiceResult {
	return { student_user_id: studentUserId, error: 'Geen profiel' };
}

export function buildInvoiceInsertRow(args: {
	invoiceNumber: string;
	studentUserId: string;
	batchId: string;
	issueDate: string;
	dueDate: string;
	collectionDate: string;
	totals: InvoiceTotals;
	ageCategory: string;
}) {
	return {
		invoice_number: args.invoiceNumber,
		student_user_id: args.studentUserId,
		batch_id: args.batchId,
		issue_date: args.issueDate,
		due_date: args.dueDate,
		period_start: args.collectionDate,
		period_end: args.collectionDate,
		amount_excl_btw_cents: args.totals.excl,
		btw_amount_cents: args.totals.btw21,
		amount_total_cents: args.totals.total,
		age_category: args.ageCategory,
		status: 'issued' as const,
	};
}

export function buildInvoiceLineInsertRows(lines: InvoiceLine[], invoiceId: string) {
	return lines.map((line, index) => ({ ...line, invoice_id: invoiceId, sort_order: index }));
}

export function resolveStudentMandateRef(studentItems: BatchItem[], mandateMap: Map<string, string>): string | null {
	const mandateId = studentItems[0]?.mandate_id;
	if (!mandateId) return null;
	return mandateMap.get(mandateId) ?? null;
}

export function buildSuccessfulStudentInvoiceResult(
	studentUserId: string,
	invoiceId: string,
	invoiceNumber: string,
): StudentInvoiceResult {
	return { student_user_id: studentUserId, invoice_id: invoiceId, invoice_number: invoiceNumber };
}

export function buildInvoiceNumberFailureResult(
	studentUserId: string,
	message: string | undefined,
): StudentInvoiceResult {
	return { student_user_id: studentUserId, error: message ?? 'next_invoice_number faalde' };
}

export function buildInvoiceInsertFailureResult(
	studentUserId: string,
	message: string | undefined,
): StudentInvoiceResult {
	return { student_user_id: studentUserId, error: message ?? 'Invoice insert faalde' };
}

export function buildInvoiceUploadFailureResult(
	studentUserId: string,
	invoiceId: string,
	uploadError: string,
): StudentInvoiceResult {
	return { student_user_id: studentUserId, invoice_id: invoiceId, error: `Upload: ${uploadError}` };
}

export function prepareStudentInvoiceData(args: {
	studentUserId: string;
	profile: ProfileRow | undefined;
	studentRow: StudentRow | undefined;
	items: BatchItem[];
	collectionDate: string;
}) {
	const profile = args.profile;
	if (!profile) return { ok: false as const, result: buildMissingProfileInvoiceResult(args.studentUserId) };

	const student = buildStudentInfo(args.studentUserId, profile, args.studentRow);
	const studentItems = filterStudentItems(args.items, args.studentUserId);
	const lines = buildInvoiceLines(studentItems, student, args.collectionDate);
	return {
		ok: true as const,
		student,
		studentItems,
		lines,
		totals: computeTotals(lines),
		ageCategory: resolveAgeCategory(lines, student.date_of_birth, args.collectionDate),
	};
}

export type PreparedStudentInvoiceData = Extract<ReturnType<typeof prepareStudentInvoiceData>, { ok: true }>;

export function resolvePreparedStudentInvoiceResult(
	existing: { id: string; invoice_number: string } | null,
	prepared: ReturnType<typeof prepareStudentInvoiceData>,
	studentUserId: string,
): StudentInvoiceResult | PreparedStudentInvoiceData {
	if (existing) return buildSkippedStudentInvoiceResult(studentUserId, existing);
	if (!prepared.ok) return prepared.result;
	return prepared;
}

export function isPreparedStudentInvoiceData(
	value: StudentInvoiceResult | PreparedStudentInvoiceData,
): value is PreparedStudentInvoiceData {
	return 'student' in value && 'lines' in value;
}

export function shouldDeliverStudentInvoiceEmail(sendEmail: boolean): boolean {
	return sendEmail;
}

export function resolveInsertedInvoiceRecord(
	inv: { id: string } | null,
	insertErrorMessage: string | undefined,
	studentUserId: string,
): { ok: true; invoiceId: string } | { ok: false; result: StudentInvoiceResult } {
	if (!inv) {
		return { ok: false, result: buildInvoiceInsertFailureResult(studentUserId, insertErrorMessage) };
	}
	return { ok: true, invoiceId: inv.id };
}
