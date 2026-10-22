import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSafeErrorMessage } from '../_shared/errors.ts';
import { beginAuthenticatedPostRequest, jsonResponse } from '../_shared/http.ts';
import {
	buildGenerateInvoiceSuccessPayload,
	type GenerateInvoiceEnvConfig,
	readGenerateInvoiceEnv,
	resolveGenerateInvoiceIssueDate,
	resolveGenerateInvoiceMissingBatchError,
	resolveGenerateInvoiceSendEmail,
} from './generateInvoiceHandlerHelpers.ts';
import { computeDueDate, verifyAdminAccess } from './invoice.ts';
import { loadBatchContext } from './loadBatchContext.ts';
import { processStudentInvoice } from './processStudentInvoice.ts';
import type { Body } from './types.ts';

function createGenerateInvoiceAdminClient(env: GenerateInvoiceEnvConfig) {
	return createClient(env.supabaseUrl, env.serviceKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
}

type GenerateInvoicePrep =
	| { ok: true; admin: SupabaseClient; batchId: string; body: Body }
	| { ok: false; response: Response };

async function prepareGenerateInvoiceRequest(req: Request): Promise<GenerateInvoicePrep> {
	const begun = await beginAuthenticatedPostRequest<Body>(req);
	if (!begun.ok) return { ok: false, response: begun.response };

	if (!begun.body.batch_id) {
		const missingBatch = resolveGenerateInvoiceMissingBatchError();
		return { ok: false, response: jsonResponse(missingBatch.status, { error: missingBatch.error }) };
	}

	const env = readGenerateInvoiceEnv((key) => Deno.env.get(key));
	const authError = await verifyAdminAccess(begun.authHeader, env.supabaseUrl, env.anonKey, env.serviceKey);
	if (authError) return { ok: false, response: authError };

	return {
		ok: true,
		admin: createGenerateInvoiceAdminClient(env),
		batchId: begun.body.batch_id,
		body: begun.body,
	};
}

async function processGenerateInvoiceBatch(admin: SupabaseClient, batchId: string, body: Body) {
	const loaded = await loadBatchContext(admin, batchId);
	if (!loaded.ok) return loaded.response;
	const { context } = loaded;

	const issueDate = resolveGenerateInvoiceIssueDate(new Date());
	const dueDate = computeDueDate(context.settings.invoice_payment_term_days);
	const sendEmail = resolveGenerateInvoiceSendEmail(body.send_email);

	const results = [];
	for (const sid of context.studentIds) {
		const result = await processStudentInvoice({
			admin,
			batchId,
			batch: context.batch,
			settings: context.settings,
			vat: context.vat,
			studentUserId: sid,
			items: context.items,
			profileMap: context.profileMap,
			studentMap: context.studentMap,
			mandateMap: context.mandateMap,
			issueDate,
			dueDate,
			sendEmail,
		});
		results.push(result);
	}

	return jsonResponse(200, buildGenerateInvoiceSuccessPayload(batchId, results));
}

export async function handleGenerateInvoiceRequest(req: Request): Promise<Response> {
	try {
		const prep = await prepareGenerateInvoiceRequest(req);
		if (!prep.ok) return prep.response;
		return await processGenerateInvoiceBatch(prep.admin, prep.batchId, prep.body);
	} catch (err) {
		console.error('generate-invoice failed', err);
		return jsonResponse(500, { error: getSafeErrorMessage(err) });
	}
}
