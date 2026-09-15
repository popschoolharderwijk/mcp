import type { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/http.ts';
import {
	buildRenderedEmailHtml,
	normalizeVars,
	renderTemplate,
	type SendTemplateEmailBody,
	sendEmailViaResend,
} from '../_shared/send-template-email-core.ts';
import {
	authorizeTemplateEmailRequest,
	beginTemplateEmailRequest,
	loadActiveTemplateEmail,
} from './prepareTemplateEmail.ts';
import { readTemplateEmailEnv } from './prepareTemplateEmailPure.ts';
import { buildSendTemplateEmailSuccessPayload } from './sendTemplateEmailHandlerPure.ts';

type PreparedTemplateEmailRequest =
	| { ok: false; response: Response }
	| {
			ok: true;
			req: Request;
			body: SendTemplateEmailBody;
			admin: ReturnType<typeof createClient>;
			resendKey: string;
			fromEmail: string;
			template: { subject: string; body_html: string; is_enabled: boolean };
	  };

async function prepareSendTemplateEmailRequest(req: Request): Promise<PreparedTemplateEmailRequest> {
	const begunResult = await beginTemplateEmailRequest(req);
	if (!begunResult.ok) return begunResult;

	const authorized = await authorizeTemplateEmailRequest(begunResult.begun);
	if (!authorized.ok) return authorized;

	const loaded = await loadActiveTemplateEmail(authorized.admin, begunResult.begun.body.event_key);
	if (!loaded.ok) return loaded;

	const mailEnv = readTemplateEmailEnv((key) => Deno.env.get(key));
	return {
		ok: true,
		req,
		body: begunResult.begun.body,
		admin: authorized.admin,
		resendKey: mailEnv.resendKey,
		fromEmail: mailEnv.fromEmail,
		template: loaded.template,
	};
}

async function deliverPreparedTemplateEmail(
	prepared: Extract<PreparedTemplateEmailRequest, { ok: true }>,
): Promise<Response> {
	const vars = normalizeVars(prepared.body.vars);
	const subject = renderTemplate(prepared.template.subject, vars);
	const renderedHtml = renderTemplate(prepared.template.body_html, vars);
	const html = await buildRenderedEmailHtml(prepared.admin, prepared.req, prepared.body, renderedHtml);

	const sendResult = await sendEmailViaResend({
		resendKey: prepared.resendKey,
		fromEmail: prepared.fromEmail,
		to: prepared.body.to,
		subject,
		html,
	});
	if (sendResult instanceof Response) return sendResult;

	return jsonResponse(200, buildSendTemplateEmailSuccessPayload(sendResult.messageId));
}

export async function handleSendTemplateEmailRequest(req: Request): Promise<Response> {
	const prepared = await prepareSendTemplateEmailRequest(req);
	if (!prepared.ok) return prepared.response;
	return deliverPreparedTemplateEmail(prepared);
}
