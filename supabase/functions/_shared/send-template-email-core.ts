import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getEmailEvent } from './email-events.ts';
import { jsonResponse, resolveAllowedSiteUrl } from './http.ts';
import { getSiteBaseUrl } from './http-serve.ts';
import {
	appendFooter,
	buildPendingFooter,
	buildPortalFooter,
	type SendTemplateEmailBody,
	validateSendTemplateEmailBodyInput,
} from './send-template-email-pure.ts';
import { requirePrivilegedUser } from './supabase.ts';

export type { SendTemplateEmailBody } from './send-template-email-pure.ts';

export function validateSendTemplateEmailBody(body: SendTemplateEmailBody): Response | null {
	const error = validateSendTemplateEmailBodyInput(body);
	if (error) return jsonResponse(400, { error });
	return null;
}

export function validateMailConfig(resendKey: string, fromEmail: string): Response | null {
	if (!resendKey || !fromEmail) {
		console.error('Missing RESEND_API_KEY_TRANSACTIONAL or RESEND_FROM_EMAIL');
		return jsonResponse(500, { error: 'Mail-configuratie ontbreekt' });
	}
	return null;
}

export async function authenticateSendTemplateEmailRequest(
	authHeader: string,
	supabaseUrl: string,
	anonKey: string,
	serviceKey: string,
): Promise<Response | null> {
	const token = authHeader.replace(/^Bearer\s+/i, '');
	if (token === serviceKey) return null;

	const userClient = createClient(supabaseUrl, anonKey, {
		global: { headers: { Authorization: authHeader } },
		auth: { autoRefreshToken: false, persistSession: false },
	});
	const authn = await requirePrivilegedUser(userClient);
	if (!authn.ok) return authn.response;
	return null;
}

export function resolveEmailEvent(
	eventKey: string,
): Response | { eventDef: NonNullable<ReturnType<typeof getEmailEvent>> } {
	const eventDef = getEmailEvent(eventKey);
	if (!eventDef) return jsonResponse(404, { error: `Onbekend event: ${eventKey}` });
	return { eventDef };
}

export async function loadEmailTemplate(
	admin: ReturnType<typeof createClient>,
	eventKey: string,
): Promise<
	| Response
	| { template: { subject: string; body_html: string; is_enabled: boolean } }
	| { skipped: true; reason: 'template_disabled' }
> {
	const { data: template, error: tErr } = await admin
		.from('email_templates')
		.select('subject, body_html, is_enabled')
		.eq('event_key', eventKey)
		.maybeSingle();

	if (tErr) {
		console.error('template fetch error', tErr);
		return jsonResponse(500, { error: 'Kon template niet ophalen' });
	}
	if (!template) return jsonResponse(404, { error: 'Template bestaat niet' });
	if (!template.is_enabled) return { skipped: true, reason: 'template_disabled' };
	return { template };
}

export async function buildRenderedEmailHtml(
	admin: ReturnType<typeof createClient>,
	req: Request,
	body: SendTemplateEmailBody,
	templateHtml: string,
): Promise<string> {
	const { data: profile } = await admin.from('profiles').select('user_id').eq('email', body.to).maybeSingle();
	const baseUrl = resolveAllowedSiteUrl(body.site_url) ?? getSiteBaseUrl(req);
	const footer = profile ? buildPortalFooter(baseUrl, body.to) : buildPendingFooter();
	return appendFooter(templateHtml, footer);
}

export async function sendEmailViaResend(input: {
	resendKey: string;
	fromEmail: string;
	to: string;
	subject: string;
	html: string;
}): Promise<Response | { messageId: string | null }> {
	const resendResp = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${input.resendKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			from: input.fromEmail,
			to: [input.to],
			subject: input.subject,
			html: input.html,
		}),
	});

	if (!resendResp.ok) {
		const errText = await resendResp.text();
		console.error('Resend error', resendResp.status, errText);
		return jsonResponse(502, { error: 'Mail-verzending mislukt', detail: errText });
	}

	const result = await resendResp.json().catch(() => ({}));
	return { messageId: (result as { id?: string }).id ?? null };
}

export { normalizeTemplateVars as normalizeVars, renderTemplate } from './send-template-email-pure.ts';
