import { formatProfileFullName } from '@/lib/profile/profileDisplayNameHelpers';

function extractInvoicePdfSignedUrl(data: unknown): string | null {
	const url = (data as { signed_url?: string } | null)?.signed_url;
	return url ?? null;
}

function resolveMissingInvoicePdfUrlError(): string {
	return 'Geen PDF-URL ontvangen.';
}

export type InvoicePdfDownloadResult = { ok: true; url: string } | { ok: false; message: string };

export async function downloadInvoicePdf(
	invoke: (body: { invoice_id: string }) => Promise<{ data: unknown; error: { message: string } | null }>,
	invoiceId: string,
): Promise<InvoicePdfDownloadResult> {
	const { data, error } = await invoke({ invoice_id: invoiceId });
	if (error) {
		return { ok: false, message: error.message };
	}
	const url = extractInvoicePdfSignedUrl(data);
	if (!url) {
		return { ok: false, message: resolveMissingInvoicePdfUrlError() };
	}
	return { ok: true, url };
}

export function formatInvoiceStudentName(
	profile: {
		first_name: string | null;
		last_name: string | null;
		email: string;
	} | null,
): string {
	return formatProfileFullName(profile);
}
