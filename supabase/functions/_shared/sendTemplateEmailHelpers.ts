export type SendTemplateEmailResult = { ok: true } | { ok: false; error: string; status?: number };

export function buildSendTemplateEmailRequestBody(opts: {
	event_key: string;
	to: string;
	vars?: Record<string, string | number | null | undefined>;
	site_url?: string;
}) {
	return {
		event_key: opts.event_key,
		to: opts.to,
		vars: opts.vars ?? {},
		site_url: opts.site_url,
	};
}

export function buildSendTemplateEmailFetchInit(
	serviceKey: string,
	body: ReturnType<typeof buildSendTemplateEmailRequestBody>,
): { method: 'POST'; headers: Record<string, string>; body: string } {
	return {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${serviceKey}`,
			apikey: serviceKey,
		},
		body: JSON.stringify(body),
	};
}

export function resolveMissingSendTemplateEmailConfig(
	supabaseUrl: string,
	serviceKey: string,
): SendTemplateEmailResult | null {
	if (!supabaseUrl || !serviceKey) {
		return { ok: false, error: 'Mail-configuratie ontbreekt', status: 500 };
	}
	return null;
}

export function resolveSendTemplateEmailHttpFailure(status: number, responseText: string): SendTemplateEmailResult {
	let error = 'Mail-verzending mislukt';
	try {
		const parsed = JSON.parse(responseText) as { error?: unknown };
		if (typeof parsed.error === 'string' && parsed.error.length > 0) {
			error = parsed.error;
		}
	} catch {
		/* body is not JSON */
	}
	return { ok: false, error, status };
}

export function prepareSendTemplateEmailRequest(
	opts: {
		event_key: string;
		to: string;
		vars?: Record<string, string | number | null | undefined>;
		origin?: string | null;
	},
	getEnv: (key: string) => string | undefined,
	resolveSiteUrl: (origin: string | null | undefined) => string | null,
):
	| {
			ok: true;
			supabaseUrl: string;
			serviceKey: string;
			requestBody: ReturnType<typeof buildSendTemplateEmailRequestBody>;
	  }
	| SendTemplateEmailResult {
	const supabaseUrl = getEnv('SUPABASE_URL') ?? '';
	const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') ?? '';
	const configError = resolveMissingSendTemplateEmailConfig(supabaseUrl, serviceKey);
	if (configError) return configError;
	const site_url = resolveSiteUrl(opts.origin) ?? undefined;
	return {
		ok: true,
		supabaseUrl,
		serviceKey,
		requestBody: buildSendTemplateEmailRequestBody({ ...opts, site_url }),
	};
}
