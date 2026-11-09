import { resolveAllowedSiteUrl } from './http.ts';
import {
	buildSendTemplateEmailFetchInit,
	type buildSendTemplateEmailRequestBody,
	prepareSendTemplateEmailRequest,
	resolveSendTemplateEmailHttpFailure,
	type SendTemplateEmailResult,
} from './sendTemplateEmailHelpers.ts';

export type { SendTemplateEmailResult } from './sendTemplateEmailHelpers.ts';

export interface SendTemplateEmailOptions {
	event_key: string;
	to: string;
	vars?: Record<string, string | number | null | undefined>;
	/** Origin header of the request that triggered this send, if any. */
	origin?: string | null;
}

async function postSendTemplateEmailRequest(
	supabaseUrl: string,
	serviceKey: string,
	eventKey: string,
	requestBody: ReturnType<typeof buildSendTemplateEmailRequestBody>,
): Promise<SendTemplateEmailResult> {
	try {
		const resp = await fetch(
			`${supabaseUrl}/functions/v1/send-template-email`,
			buildSendTemplateEmailFetchInit(serviceKey, requestBody),
		);
		if (resp.ok) return { ok: true };
		const text = await resp.text().catch(() => '');
		console.error(`${eventKey} mail non-2xx`, resp.status, text);
		return resolveSendTemplateEmailHttpFailure(resp.status, text);
	} catch (mailErr) {
		console.error(`${eventKey} mail`, mailErr);
		return { ok: false, error: 'Mail-verzending mislukt', status: 502 };
	}
}

export async function sendTemplateEmail(opts: SendTemplateEmailOptions): Promise<SendTemplateEmailResult> {
	const prepared = prepareSendTemplateEmailRequest(opts, (key) => Deno.env.get(key), resolveAllowedSiteUrl);
	if (!prepared.ok) {
		console.error(`${opts.event_key} mail`, prepared.error);
		return prepared;
	}
	return postSendTemplateEmailRequest(
		prepared.supabaseUrl,
		prepared.serviceKey,
		opts.event_key,
		prepared.requestBody,
	);
}
