import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { beginAuthenticatedPostRequest, jsonResponse } from '../_shared/http.ts';
import {
	buildInvoicePdfSuccessPayload,
	hasInvoicePdfStoragePath,
	readInvoicePdfEnv,
	resolveInvoiceNotAvailableError,
	resolveMissingInvoiceIdError,
	resolveSignedUrlCreationError,
} from './validationPure.ts';

interface Body {
	invoice_id: string;
}

async function loadAuthorizedInvoice(
	userClient: ReturnType<typeof createClient>,
	invoiceId: string,
): Promise<
	{ ok: false; response: Response } | { ok: true; invoice: { invoice_number: string; pdf_storage_path: string } }
> {
	const { data: inv, error } = await userClient
		.from('invoices')
		.select('id, invoice_number, pdf_storage_path')
		.eq('id', invoiceId)
		.maybeSingle();
	if (error || !hasInvoicePdfStoragePath(inv)) {
		return { ok: false, response: jsonResponse(404, { error: resolveInvoiceNotAvailableError() }) };
	}
	return { ok: true, invoice: inv };
}

async function createInvoiceSignedUrlResponse(
	admin: ReturnType<typeof createClient>,
	pdfStoragePath: string,
	invoiceNumber: string,
): Promise<Response> {
	const { data, error } = await admin.storage.from('invoices').createSignedUrl(pdfStoragePath, 60);
	if (error || !data?.signedUrl) return jsonResponse(500, { error: resolveSignedUrlCreationError() });
	return jsonResponse(200, buildInvoicePdfSuccessPayload(data.signedUrl, invoiceNumber));
}

export async function handleGetInvoicePdfRequest(req: Request): Promise<Response> {
	const begun = await beginAuthenticatedPostRequest<Body>(req);
	if (!begun.ok) return begun.response;
	if (!begun.body.invoice_id) return jsonResponse(400, { error: resolveMissingInvoiceIdError() });

	const env = readInvoicePdfEnv((key) => Deno.env.get(key));

	const userClient = createClient(env.supabaseUrl, env.anonKey, {
		global: { headers: { Authorization: begun.authHeader } },
		auth: { autoRefreshToken: false, persistSession: false },
	});
	const loaded = await loadAuthorizedInvoice(userClient, begun.body.invoice_id);
	if (!loaded.ok) return loaded.response;

	const admin = createClient(env.supabaseUrl, env.serviceKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
	return createInvoiceSignedUrlResponse(admin, loaded.invoice.pdf_storage_path, loaded.invoice.invoice_number);
}
