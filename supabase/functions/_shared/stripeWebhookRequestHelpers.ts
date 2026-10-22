export interface StripeWebhookEnvConfig {
	supabaseUrl: string;
	serviceKey: string;
	webhookSecret: string;
}

export function validateStripeWebhookRequest(
	signature: string | null,
	webhookSecret: string | undefined,
): { ok: true } | { ok: false; status: number; error: string } {
	if (!signature || !webhookSecret) {
		return { ok: false, status: 400, error: 'Missing signature/secret' };
	}
	return { ok: true };
}

export function readStripeWebhookEnv(
	getEnv: (key: string) => string | undefined,
): Omit<StripeWebhookEnvConfig, 'webhookSecret'> & { webhookSecret: string | undefined } {
	return {
		supabaseUrl: getEnv('SUPABASE_URL') ?? '',
		serviceKey: getEnv('SUPABASE_SERVICE_ROLE_KEY') ?? '',
		webhookSecret: getEnv('STRIPE_WEBHOOK_SECRET'),
	};
}
