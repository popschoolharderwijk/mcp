export function resolveGenerateInvoiceMissingBatchError(): { status: number; error: string } {
	return { status: 400, error: 'batch_id vereist' };
}

export function resolveGenerateInvoiceSendEmail(sendEmail: boolean | undefined): boolean {
	return sendEmail !== false;
}

export function resolveGenerateInvoiceIssueDate(now: Date): string {
	return now.toISOString().slice(0, 10);
}

export interface GenerateInvoiceEnvConfig {
	supabaseUrl: string;
	anonKey: string;
	serviceKey: string;
}

export function readGenerateInvoiceEnv(getEnv: (key: string) => string | undefined): GenerateInvoiceEnvConfig {
	return {
		supabaseUrl: getEnv('SUPABASE_URL') ?? '',
		anonKey: getEnv('SUPABASE_ANON_KEY') ?? '',
		serviceKey: getEnv('SUPABASE_SERVICE_ROLE_KEY') ?? '',
	};
}

export function buildGenerateInvoiceSuccessPayload(
	batchId: string,
	results: unknown[],
): { ok: true; batch_id: string; results: unknown[] } {
	return { ok: true, batch_id: batchId, results };
}
