export function buildPortalFooter(baseUrl: string, recipient: string): string {
	const loginUrl = `${baseUrl}/login?email=${encodeURIComponent(recipient)}`;
	return `
<div style="margin-top:32px;padding:16px 20px;border-top:1px solid #e5e5e5;font-family:Arial,sans-serif;font-size:13px;color:#555;text-align:center;">
  <p style="margin:0 0 8px;">Log in op het portaal voor meer informatie:</p>
  <p style="margin:0;"><a href="${loginUrl}" style="color:#ea580c;text-decoration:none;font-weight:600;">Open het portaal</a></p>
  <p style="margin:8px 0 0;font-size:11px;color:#999;">Je ontvangt direct een inloglink op ${recipient}.</p>
</div>`;
}

export function buildPendingFooter(): string {
	return `
<div style="margin-top:32px;padding:16px 20px;border-top:1px solid #e5e5e5;font-family:Arial,sans-serif;font-size:13px;color:#555;text-align:center;">
  <p style="margin:0;">Je kunt inloggen op het portaal zodra je aanmelding is verwerkt. We nemen zo snel mogelijk contact met je op.</p>
</div>`;
}

export function appendFooter(html: string, footer: string): string {
	if (/<\/body>/i.test(html)) {
		return html.replace(/<\/body>/i, `${footer}</body>`);
	}
	return `${html}${footer}`;
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
	return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
		const value = vars[key];
		return value !== undefined && value !== null ? String(value) : match;
	});
}

export function isDefinedTemplateVar(value: string | number | null | undefined): value is string | number {
	return value !== null && value !== undefined;
}

export function normalizeTemplateVars(
	input: Record<string, string | number | null | undefined> | undefined,
): Record<string, string> {
	const out: Record<string, string> = {};
	if (!input) return out;
	for (const [k, v] of Object.entries(input)) {
		if (!isDefinedTemplateVar(v)) continue;
		out[k] = String(v);
	}
	return out;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidTemplateRecipient(email: string): boolean {
	return EMAIL_RE.test(email);
}

export interface SendTemplateEmailBody {
	event_key: string;
	to: string;
	vars?: Record<string, string | number | null | undefined>;
	site_url?: string;
}

export function resolveSendTemplateEmailEventKeyError(eventKey: string | undefined): string | null {
	if (!eventKey || typeof eventKey !== 'string') return 'event_key vereist';
	return null;
}

export function resolveSendTemplateEmailRecipientError(to: string | undefined): string | null {
	if (!to || !isValidTemplateRecipient(to)) return 'Ongeldig e-mailadres';
	return null;
}

export function validateSendTemplateEmailBodyInput(body: SendTemplateEmailBody): string | null {
	return resolveSendTemplateEmailEventKeyError(body.event_key) ?? resolveSendTemplateEmailRecipientError(body.to);
}
