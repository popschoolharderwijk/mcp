export function buildSendTemplateEmailSuccessPayload(messageId: string | null): {
	ok: true;
	message_id: string | null;
} {
	return { ok: true, message_id: messageId };
}
