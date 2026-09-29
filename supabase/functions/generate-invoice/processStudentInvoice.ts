import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildPdf } from './buildPdf.ts';
import { bytesToBase64, fmtDateNL, fmtEUR } from './format.ts';
import {
	buildInvoiceEmailDeliveryContent,
	buildResendInvoiceEmailPayload,
	canSendInvoiceEmail,
	findExistingInvoice,
	readInvoiceMailEnv,
	shouldRecordInvoiceEmailSent,
} from './invoice.ts';
import {
	buildInvoiceInsertRow,
	buildInvoiceLineInsertRows,
	buildInvoiceNumberFailureResult,
	buildInvoiceStoragePath,
	buildInvoiceUploadFailureResult,
	buildSuccessfulStudentInvoiceResult,
	isPreparedStudentInvoiceData,
	type PreparedStudentInvoiceData,
	prepareStudentInvoiceData,
	resolveInsertedInvoiceRecord,
	resolvePreparedStudentInvoiceResult,
	resolveStudentMandateRef,
	shouldDeliverStudentInvoiceEmail,
} from './processStudentInvoicePure.ts';
import type {
	AccountingSettings,
	BatchItem,
	DirectDebitBatch,
	ProfileRow,
	StudentInfo,
	StudentInvoiceResult,
	StudentRow,
} from './types.ts';

interface ProcessStudentArgs {
	admin: SupabaseClient;
	batchId: string;
	batch: DirectDebitBatch;
	settings: AccountingSettings;
	studentUserId: string;
	items: BatchItem[];
	profileMap: Map<string, ProfileRow>;
	studentMap: Map<string, StudentRow>;
	mandateMap: Map<string, string>;
	issueDate: string;
	dueDate: string;
	sendEmail: boolean;
}

async function uploadPdf(
	admin: SupabaseClient,
	studentUserId: string,
	invoiceId: string,
	pdfBytes: Uint8Array,
): Promise<string | null> {
	const storagePath = buildInvoiceStoragePath(studentUserId, invoiceId);
	const { error } = await admin.storage.from('invoices').upload(storagePath, pdfBytes, {
		contentType: 'application/pdf',
		upsert: true,
	});
	if (error) return error.message;
	await admin.from('invoices').update({ pdf_storage_path: storagePath }).eq('id', invoiceId);
	return null;
}

async function sendInvoiceEmail(
	admin: SupabaseClient,
	args: {
		student: StudentInfo;
		invoiceId: string;
		invoiceNumber: string;
		totals: { total: number };
		dueDate: string;
		mandateRef: string | null;
		settings: AccountingSettings;
		pdfBytes: Uint8Array;
	},
): Promise<void> {
	const mailEnv = readInvoiceMailEnv((key) => Deno.env.get(key));
	const content = buildInvoiceEmailDeliveryContent({
		student: args.student,
		invoiceNumber: args.invoiceNumber,
		totals: args.totals,
		dueDate: args.dueDate,
		mandateRef: args.mandateRef,
		settings: args.settings,
		formatDate: fmtDateNL,
		formatCurrency: fmtEUR,
	});
	if (!canSendInvoiceEmail(content.recipient, mailEnv.resendKey, mailEnv.fromEmail)) return;

	const resp = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: { Authorization: `Bearer ${mailEnv.resendKey}`, 'Content-Type': 'application/json' },
		body: JSON.stringify(
			buildResendInvoiceEmailPayload({
				fromEmail: mailEnv.fromEmail,
				recipient: content.recipient,
				subject: content.subject,
				html: content.html,
				invoiceNumber: args.invoiceNumber,
				pdfBase64: bytesToBase64(args.pdfBytes),
			}),
		),
	});

	if (shouldRecordInvoiceEmailSent(resp.ok)) {
		await admin
			.from('invoices')
			.update({ sent_at: new Date().toISOString(), email_sent_to: content.recipient })
			.eq('id', args.invoiceId);
		return;
	}
	console.error('Resend error', resp.status, await resp.text());
}

async function allocateInvoiceNumber(
	admin: SupabaseClient,
	studentUserId: string,
): Promise<{ ok: true; invoiceNumber: string } | { ok: false; result: StudentInvoiceResult }> {
	const { data, error } = await admin.rpc('next_invoice_number');
	if (error || !data) {
		return { ok: false, result: buildInvoiceNumberFailureResult(studentUserId, error?.message) };
	}
	return { ok: true, invoiceNumber: String(data) };
}

async function insertInvoiceRecord(
	admin: SupabaseClient,
	args: ProcessStudentArgs,
	prepared: PreparedStudentInvoiceData,
	invoiceNumber: string,
	collectionDate: string,
) {
	return admin
		.from('invoices')
		.insert(
			buildInvoiceInsertRow({
				invoiceNumber,
				studentUserId: args.studentUserId,
				batchId: args.batchId,
				issueDate: args.issueDate,
				dueDate: args.dueDate,
				collectionDate,
				totals: prepared.totals,
				ageCategory: prepared.ageCategory,
			}),
		)
		.select('id, invoice_number')
		.single();
}

async function deliverStudentInvoiceEmailIfRequested(
	args: ProcessStudentArgs,
	prepared: PreparedStudentInvoiceData,
	record: { invoiceId: string; invoiceNumber: string; mandateRef: string | null },
	pdfBytes: Uint8Array,
): Promise<void> {
	if (!shouldDeliverStudentInvoiceEmail(args.sendEmail)) return;
	await sendInvoiceEmail(args.admin, {
		student: prepared.student,
		invoiceId: record.invoiceId,
		invoiceNumber: record.invoiceNumber,
		totals: prepared.totals,
		dueDate: args.dueDate,
		mandateRef: record.mandateRef,
		settings: args.settings,
		pdfBytes,
	});
}

async function createStudentInvoiceRecord(
	args: ProcessStudentArgs,
	prepared: PreparedStudentInvoiceData,
	collectionDate: string,
): Promise<
	| { ok: true; invoiceId: string; invoiceNumber: string; mandateRef: string | null }
	| { ok: false; result: StudentInvoiceResult }
> {
	const allocated = await allocateInvoiceNumber(args.admin, args.studentUserId);
	if (!allocated.ok) return allocated;

	const { data: inv, error: insErr } = await insertInvoiceRecord(
		args.admin,
		args,
		prepared,
		allocated.invoiceNumber,
		collectionDate,
	);
	const insertResult = resolveInsertedInvoiceRecord(inv, insErr?.message, args.studentUserId);
	if (!insertResult.ok) return insertResult;

	await args.admin.from('invoice_lines').insert(buildInvoiceLineInsertRows(prepared.lines, insertResult.invoiceId));
	const mandateRef = resolveStudentMandateRef(prepared.studentItems, args.mandateMap);

	return {
		ok: true,
		invoiceId: insertResult.invoiceId,
		invoiceNumber: allocated.invoiceNumber,
		mandateRef,
	};
}

async function finalizeStudentInvoicePdf(
	args: ProcessStudentArgs,
	prepared: PreparedStudentInvoiceData,
	record: { invoiceId: string; invoiceNumber: string; mandateRef: string | null },
): Promise<{ ok: true; pdfBytes: Uint8Array } | { ok: false; result: StudentInvoiceResult }> {
	const pdfBytes = await buildPdf({
		settings: args.settings,
		invoiceNumber: record.invoiceNumber,
		issueDate: args.issueDate,
		dueDate: args.dueDate,
		periodStart: args.batch.collection_date,
		periodEnd: args.batch.collection_date,
		student: prepared.student,
		mandateRef: record.mandateRef,
		lines: prepared.lines,
		totals: prepared.totals,
	});

	const uploadError = await uploadPdf(args.admin, args.studentUserId, record.invoiceId, pdfBytes);
	if (uploadError) {
		return {
			ok: false,
			result: buildInvoiceUploadFailureResult(args.studentUserId, record.invoiceId, uploadError),
		};
	}

	return { ok: true, pdfBytes };
}

export async function processStudentInvoice(args: ProcessStudentArgs): Promise<StudentInvoiceResult> {
	const existing = await findExistingInvoice(args.admin, args.batchId, args.studentUserId);
	const preparedResult = resolvePreparedStudentInvoiceResult(
		existing,
		prepareStudentInvoiceData({
			studentUserId: args.studentUserId,
			profile: args.profileMap.get(args.studentUserId),
			studentRow: args.studentMap.get(args.studentUserId),
			items: args.items,
			collectionDate: args.batch.collection_date,
		}),
		args.studentUserId,
	);
	if (!isPreparedStudentInvoiceData(preparedResult)) return preparedResult;

	const record = await createStudentInvoiceRecord(args, preparedResult, args.batch.collection_date);
	if (!record.ok) return record.result;

	const finalized = await finalizeStudentInvoicePdf(args, preparedResult, record);
	if (!finalized.ok) return finalized.result;

	await deliverStudentInvoiceEmailIfRequested(args, preparedResult, record, finalized.pdfBytes);

	return buildSuccessfulStudentInvoiceResult(args.studentUserId, record.invoiceId, record.invoiceNumber);
}
