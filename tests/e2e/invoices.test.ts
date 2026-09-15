/**
 * End-to-end test for the invoice generate + fetch flow.
 *
 * Flow:
 *  1. Admin creates a SEPA mandate + direct-debit batch + batch item (service role).
 *  2. Admin (JWT) calls `generate-invoice` → invoice + PDF must exist.
 *  3. The owning student calls `get-invoice-pdf` → receives a signed URL (RLS allows).
 *  4. Another student requests the same invoice → 404 (RLS blocks).
 *  5. An anonymous call → 401.
 *  6. Cleanup: invoice_lines, invoices, batch_items, batches, mandate, storage object.
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs, createClientBypassRLS } from '../db';
import { TestUsers } from '../rls/test-users';
import { expectNonNull } from '../utils';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const ANON_KEY = process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? '';

const TEST_IBAN = 'NL91ABNA0417164300';

interface InvokeResult {
	status: number;
	json: Record<string, unknown> | null;
}

async function invokeFn(fn: string, opts: { token?: string; body: unknown }): Promise<InvokeResult> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		apikey: ANON_KEY,
	};
	if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
	const resp = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
		method: 'POST',
		headers,
		body: JSON.stringify(opts.body),
	});
	let json: Record<string, unknown> | null = null;
	try {
		json = (await resp.json()) as Record<string, unknown>;
	} catch {
		json = null;
	}
	return { status: resp.status, json };
}

async function resolveE2eStudentUserId(admin: ReturnType<typeof createClientBypassRLS>): Promise<string> {
	const studentEmail = TestUsers.STUDENT_001;
	const otherEmail = TestUsers.STUDENT_002;
	const { data: profs } = await admin
		.from('profiles')
		.select('user_id, email')
		.in('email', [studentEmail, otherEmail]);
	expectNonNull(profs);
	const byEmail = new Map(profs.map((p) => [p.email, p.user_id]));
	const studentUserId = byEmail.get(studentEmail) as string;
	expect(studentUserId).toBeTruthy();
	expect(byEmail.get(otherEmail)).toBeTruthy();
	return studentUserId;
}

async function ensureE2eAccountingSettings(admin: ReturnType<typeof createClientBypassRLS>): Promise<boolean> {
	const { data: existingSettings } = await admin
		.from('accounting_settings')
		.select('id')
		.eq('id', true)
		.maybeSingle();
	if (existingSettings) return false;
	const { error: insSetErr } = await admin
		.from('accounting_settings')
		.insert({ id: true, company_name: 'E2E Test School' });
	if (insSetErr) throw new Error(`accounting_settings insert: ${insSetErr.message}`);
	return true;
}

async function insertE2eMandate(
	admin: ReturnType<typeof createClientBypassRLS>,
	studentUserId: string,
): Promise<string> {
	const { data: mand, error: mErr } = await admin
		.from('sepa_mandates')
		.insert({
			student_user_id: studentUserId,
			mandate_reference: `E2E-MND-${Date.now()}`,
			iban: TEST_IBAN,
			account_holder: 'E2E Test',
			status: 'active',
			signed_at: new Date().toISOString().slice(0, 10),
		})
		.select('id')
		.single();
	if (mErr || !mand) throw new Error(`mandate insert: ${mErr?.message}`);
	return mand.id;
}

async function insertE2eBatch(admin: ReturnType<typeof createClientBypassRLS>): Promise<string> {
	const { data: batch, error: bErr } = await admin
		.from('incasso_batches')
		.insert({
			batch_number: `E2E-BATCH-${Date.now()}`,
			status: 'draft',
			collection_date: new Date().toISOString().slice(0, 10),
		})
		.select('id')
		.single();
	if (bErr || !batch) throw new Error(`batch insert: ${bErr?.message}`);
	return batch.id;
}

async function insertE2eBatchItem(
	admin: ReturnType<typeof createClientBypassRLS>,
	batchId: string,
	mandateId: string,
	studentUserId: string,
): Promise<string> {
	const { data: item, error: iErr } = await admin
		.from('incasso_batch_items')
		.insert({
			batch_id: batchId,
			mandate_id: mandateId,
			student_user_id: studentUserId,
			end_to_end_id: `E2E-ITEM-${Date.now()}`,
			amount_cents: 5000,
			remittance_info: 'E2E test lesgeld',
			kind: 'manual',
			sequence_type: 'OOFF',
		})
		.select('id')
		.single();
	if (iErr || !item) throw new Error(`item insert: ${iErr?.message}`);
	return item.id;
}

describe('E2E: generate-invoice + get-invoice-pdf with RLS', () => {
	const admin = createClientBypassRLS();
	let studentUserId: string;
	let mandateId: string;
	let batchId: string;
	let batchItemId: string;
	let invoiceId: string | null = null;
	let pdfStoragePath: string | null = null;
	let createdSettings = false;

	beforeAll(async () => {
		if (!SUPABASE_URL || !ANON_KEY) throw new Error('SUPABASE_URL and publishable key required');
		studentUserId = await resolveE2eStudentUserId(admin);
		createdSettings = await ensureE2eAccountingSettings(admin);
		mandateId = await insertE2eMandate(admin, studentUserId);
		batchId = await insertE2eBatch(admin);
		batchItemId = await insertE2eBatchItem(admin, batchId, mandateId, studentUserId);
	});

	afterAll(async () => {
		// Storage cleanup
		if (pdfStoragePath) {
			await admin.storage.from('invoices').remove([pdfStoragePath]);
		}
		// DB cleanup (CASCADE removes incasso_batch_items via batch)
		if (invoiceId) {
			await admin.from('invoice_lines').delete().eq('invoice_id', invoiceId);
			await admin.from('invoices').delete().eq('id', invoiceId);
		}
		if (batchItemId) await admin.from('incasso_batch_items').delete().eq('id', batchItemId);
		if (batchId) await admin.from('incasso_batches').delete().eq('id', batchId);
		if (mandateId) await admin.from('sepa_mandates').delete().eq('id', mandateId);
		if (createdSettings) await admin.from('accounting_settings').delete().eq('id', true);
	});

	it('admin can call generate-invoice and an invoice is created', async () => {
		const adminClient = await createClientAs(TestUsers.ADMIN_ONE);
		const { data: sess } = await adminClient.auth.getSession();
		const token = sess.session?.access_token;
		expect(token).toBeTruthy();

		const res = await invokeFn('generate-invoice', {
			token,
			body: { batch_id: batchId, send_email: false },
		});
		expect(res.status).toBe(200);
		const results = (res.json?.results ?? []) as Array<{ invoice_id?: string; error?: string }>;
		expect(results.length).toBe(1);
		expect(results[0].error).toBeUndefined();
		expect(results[0].invoice_id).toBeTruthy();
		invoiceId = results[0].invoice_id as string;

		// Verify DB rows
		const { data: inv } = await admin
			.from('invoices')
			.select('id, student_user_id, status, pdf_storage_path, amount_total_cents')
			.eq('id', invoiceId)
			.single();
		expectNonNull(inv);
		expect(inv.student_user_id).toBe(studentUserId);
		expect(inv.status).toBe('issued');
		expect(inv.amount_total_cents).toBe(5000);
		expect(inv.pdf_storage_path).toBeTruthy();
		pdfStoragePath = inv.pdf_storage_path as string;

		const { data: lines } = await admin.from('invoice_lines').select('id').eq('invoice_id', invoiceId);
		expectNonNull(lines);
		expect(lines.length).toBe(1);
	});

	it('calling again does not create duplicates (idempotent)', async () => {
		if (!invoiceId) throw new Error('previous test must succeed first');
		const adminClient = await createClientAs(TestUsers.ADMIN_ONE);
		const { data: sess } = await adminClient.auth.getSession();
		const token = sess.session?.access_token as string;
		const res = await invokeFn('generate-invoice', {
			token,
			body: { batch_id: batchId, send_email: false },
		});
		expect(res.status).toBe(200);
		const results = (res.json?.results ?? []) as Array<{ skipped?: boolean; invoice_id?: string }>;
		expect(results[0].skipped).toBe(true);
		expect(results[0].invoice_id).toBe(invoiceId);
	});

	it('owning student gets a signed URL via get-invoice-pdf and can download the PDF', async () => {
		if (!invoiceId) throw new Error('previous test must succeed first');
		const studentClient = await createClientAs(TestUsers.STUDENT_001);
		const { data: sess } = await studentClient.auth.getSession();
		const token = sess.session?.access_token as string;

		const res = await invokeFn('get-invoice-pdf', { token, body: { invoice_id: invoiceId } });
		expect(res.status).toBe(200);
		const signedUrl = res.json?.signed_url as string;
		expect(signedUrl).toBeTruthy();

		const pdfResp = await fetch(signedUrl);
		expect(pdfResp.status).toBe(200);
		const bytes = new Uint8Array(await pdfResp.arrayBuffer());
		// PDF magic bytes %PDF
		expect(bytes[0]).toBe(0x25);
		expect(bytes[1]).toBe(0x50);
		expect(bytes[2]).toBe(0x44);
		expect(bytes[3]).toBe(0x46);
	});

	it('another student gets 404 (RLS blocks access to the invoice)', async () => {
		if (!invoiceId) throw new Error('previous test must succeed first');
		const otherClient = await createClientAs(TestUsers.STUDENT_002);
		const { data: sess } = await otherClient.auth.getSession();
		const token = sess.session?.access_token as string;
		const res = await invokeFn('get-invoice-pdf', { token, body: { invoice_id: invoiceId } });
		expect(res.status).toBe(404);
	});

	it('anonymous get-invoice-pdf call is rejected with 401', async () => {
		if (!invoiceId) throw new Error('previous test must succeed first');
		const res = await invokeFn('get-invoice-pdf', { body: { invoice_id: invoiceId } });
		expect(res.status).toBe(401);
	});

	it('non-admin (student) cannot call generate-invoice (403)', async () => {
		const studentClient = await createClientAs(TestUsers.STUDENT_001);
		const { data: sess } = await studentClient.auth.getSession();
		const token = sess.session?.access_token as string;
		const res = await invokeFn('generate-invoice', {
			token,
			body: { batch_id: batchId, send_email: false },
		});
		expect(res.status).toBe(403);
	});
});
