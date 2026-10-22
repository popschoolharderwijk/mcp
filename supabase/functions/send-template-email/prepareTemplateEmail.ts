import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { beginAuthenticatedPostRequest, jsonResponse } from '../_shared/http.ts';
import {
	authenticateSendTemplateEmailRequest,
	loadEmailTemplate,
	resolveEmailEvent,
	type SendTemplateEmailBody,
	validateMailConfig,
	validateSendTemplateEmailBody,
} from '../_shared/send-template-email-core.ts';
import { isFailedEmailEventResult, readTemplateEmailEnv } from './prepareTemplateEmailHelpers.ts';
import { buildSkippedTemplateEmailPayload, isSkippedTemplateResult } from './sendTemplateEmailHandlerHelpers.ts';

type BegunTemplateEmailRequest = Extract<
	Awaited<ReturnType<typeof beginAuthenticatedPostRequest<SendTemplateEmailBody>>>,
	{ ok: true }
>;

export async function beginTemplateEmailRequest(
	req: Request,
): Promise<{ ok: false; response: Response } | { ok: true; begun: BegunTemplateEmailRequest }> {
	const begun = await beginAuthenticatedPostRequest<SendTemplateEmailBody>(req);
	if (!begun.ok) return { ok: false, response: begun.response };

	const bodyError = validateSendTemplateEmailBody(begun.body);
	if (bodyError) return { ok: false, response: bodyError };

	return { ok: true, begun };
}

export async function authorizeTemplateEmailRequest(
	begun: BegunTemplateEmailRequest,
): Promise<{ ok: false; response: Response } | { ok: true; admin: ReturnType<typeof createClient> }> {
	const env = readTemplateEmailEnv((key) => Deno.env.get(key));

	const configError = validateMailConfig(env.resendKey, env.fromEmail);
	if (configError) return { ok: false, response: configError };

	const authError = await authenticateSendTemplateEmailRequest(
		begun.authHeader,
		env.supabaseUrl,
		env.anonKey,
		env.serviceKey,
	);
	if (authError) return { ok: false, response: authError };

	const eventResult = resolveEmailEvent(begun.body.event_key);
	if (isFailedEmailEventResult(eventResult)) return { ok: false, response: eventResult };

	const admin = createClient(env.supabaseUrl, env.serviceKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});

	return { ok: true, admin };
}

export async function loadActiveTemplateEmail(
	admin: ReturnType<typeof createClient>,
	eventKey: string,
): Promise<
	| { ok: false; response: Response }
	| { ok: true; template: { subject: string; body_html: string; is_enabled: boolean } }
> {
	const templateResult = await loadEmailTemplate(admin, eventKey);
	if (templateResult instanceof Response) return { ok: false, response: templateResult };
	if (isSkippedTemplateResult(templateResult)) {
		return {
			ok: false,
			response: jsonResponse(200, buildSkippedTemplateEmailPayload(templateResult.reason)),
		};
	}
	return { ok: true, template: templateResult.template };
}
