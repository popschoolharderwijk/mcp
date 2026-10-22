export function resolveMissingInvoiceIdError(): string {
	return 'invoice_id vereist';
}

export function resolveInvoiceNotAvailableError(): string {
	return 'Factuur niet beschikbaar';
}

export function resolveSignedUrlCreationError(): string {
	return 'Kon URL niet maken';
}

export function hasInvoicePdfStoragePath(invoice: { pdf_storage_path: string | null } | null): boolean {
	return Boolean(invoice?.pdf_storage_path);
}

export function buildInvoicePdfSuccessPayload(signedUrl: string, invoiceNumber: string) {
	return { signed_url: signedUrl, invoice_number: invoiceNumber };
}

export interface InvoicePdfEnvConfig {
	supabaseUrl: string;
	anonKey: string;
	serviceKey: string;
}

export function readInvoicePdfEnv(getEnv: (key: string) => string | undefined): InvoicePdfEnvConfig {
	return {
		supabaseUrl: getEnv('SUPABASE_URL') ?? '',
		anonKey: getEnv('SUPABASE_ANON_KEY') ?? '',
		serviceKey: getEnv('SUPABASE_SERVICE_ROLE_KEY') ?? '',
	};
}
