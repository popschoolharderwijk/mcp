import { describe, expect, it } from 'bun:test';
import { buildSendTemplateEmailSuccessPayload } from '../../../supabase/functions/send-template-email/sendTemplateEmailHandlerHelpers';

describe('buildSendTemplateEmailSuccessPayload', () => {
	it('wraps the resend message id', () => {
		expect(buildSendTemplateEmailSuccessPayload('msg-1')).toEqual({ ok: true, message_id: 'msg-1' });
	});
});
