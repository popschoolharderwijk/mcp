import { resolveAllowedSiteUrl } from './http.ts';
import { buildSendTemplateEmailFetchInit, buildSendTemplateEmailRequestBody } from './sendTemplateEmailPure.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

export interface SendTemplateEmailOptions {
	event_key: string;
	to: string;
	vars?: Record<string, string | number | null | undefined>;
	/** Origin header of the request that triggered this send, if any. */
	origin?: string | null;
}

/** Returns true when send-template-email answered 2xx (a disabled template also counts as sent). */
export async function sendTemplateEmail(opts: SendTemplateEmailOptions): Promise<boolean> {
	const site_url = resolveAllowedSiteUrl(opts.origin) ?? undefined;
	const requestBody = buildSendTemplateEmailRequestBody({ ...opts, site_url });
	try {
		const resp = await fetch(
			`${supabaseUrl}/functions/v1/send-template-email`,
			buildSendTemplateEmailFetchInit(serviceKey, requestBody),
		);
		if (!resp.ok) {
			const text = await resp.text().catch(() => '');
			console.error(`${opts.event_key} mail non-2xx`, resp.status, text);
			return false;
		}
		return true;
	} catch (mailErr) {
		console.error(`${opts.event_key} mail`, mailErr);
		return false;
	}
}
