import { describe, expect, it } from 'bun:test';
import {
	buildSendTemplateEmailSuccessPayload,
	buildSkippedTemplateEmailPayload,
	isSkippedTemplateResult,
} from '../../../supabase/functions/send-template-email/sendTemplateEmailHandlerHelpers';

describe('buildSendTemplateEmailSuccessPayload', () => {
	it('wraps the resend message id', () => {
		expect(buildSendTemplateEmailSuccessPayload('msg-1')).toEqual({ ok: true, message_id: 'msg-1' });
	});
});

describe('buildSkippedTemplateEmailPayload', () => {
	it('returns the skipped template payload', () => {
		expect(buildSkippedTemplateEmailPayload('template_disabled')).toEqual({
			skipped: true,
			reason: 'template_disabled',
		});
	});
});

describe('isSkippedTemplateResult', () => {
	it('returns true for skipped template results', () => {
		expect(isSkippedTemplateResult({ skipped: true, reason: 'template_disabled' })).toBe(true);
	});

	it('returns false for other results', () => {
		expect(isSkippedTemplateResult({ template: { subject: 'Hi', body_html: '<p>Hi</p>', is_enabled: true } })).toBe(
			false,
		);
	});
});
