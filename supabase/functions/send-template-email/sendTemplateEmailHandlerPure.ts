export function buildSendTemplateEmailSuccessPayload(messageId: string | null): {
	ok: true;
	message_id: string | null;
} {
	return { ok: true, message_id: messageId };
}

export function buildSkippedTemplateEmailPayload(reason: 'template_disabled'): {
	skipped: true;
	reason: 'template_disabled';
} {
	return { skipped: true, reason };
}

export function isSkippedTemplateResult(result: unknown): result is { skipped: true; reason: 'template_disabled' } {
	return Boolean(result && typeof result === 'object' && 'skipped' in result);
}
