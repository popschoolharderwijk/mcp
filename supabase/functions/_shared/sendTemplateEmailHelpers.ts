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
		},
		body: JSON.stringify(body),
	};
}
