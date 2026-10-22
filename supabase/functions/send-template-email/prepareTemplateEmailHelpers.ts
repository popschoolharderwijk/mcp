export interface TemplateEmailEnvConfig {
	supabaseUrl: string;
	anonKey: string;
	serviceKey: string;
	resendKey: string;
	fromEmail: string;
}

export function readTemplateEmailEnv(getEnv: (key: string) => string | undefined): TemplateEmailEnvConfig {
	return {
		supabaseUrl: getEnv('SUPABASE_URL') ?? '',
		anonKey: getEnv('SUPABASE_ANON_KEY') ?? '',
		serviceKey: getEnv('SUPABASE_SERVICE_ROLE_KEY') ?? '',
		resendKey: getEnv('RESEND_API_KEY_TRANSACTIONAL') ?? '',
		fromEmail: getEnv('RESEND_FROM_EMAIL') ?? '',
	};
}

export function isFailedEmailEventResult(result: unknown): result is Response {
	return result instanceof Response;
}
