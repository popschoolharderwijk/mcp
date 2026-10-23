import { describe, expect, it } from 'bun:test';
import { buildEmailTemplateEditorStateFromRow } from '../../../src/lib/email/emailTemplateEditorHelpers';

describe('buildEmailTemplateEditorStateFromRow', () => {
	it('maps row fields to editor state', () => {
		expect(
			buildEmailTemplateEditorStateFromRow({
				event_key: 'signup',
				subject: 'Welkom',
				body_markdown: 'Hi **there**',
			}),
		).toEqual({
			subject: 'Welkom',
			body_markdown: 'Hi **there**',
		});
	});
});
