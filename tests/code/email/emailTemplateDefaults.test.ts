import { describe, expect, it } from 'bun:test';
import {
	EMAIL_TEMPLATE_BOOTSTRAP,
	getEmailTemplateBootstrap,
	isEmailTemplateEditorAtBootstrap,
	isEmailTemplateEditorDirty,
} from '../../../src/lib/email/emailTemplateDefaults';

describe('getEmailTemplateBootstrap', () => {
	it('returns a copy of the signup_received bootstrap template', () => {
		const defaults = getEmailTemplateBootstrap('signup_received');
		expect(defaults).toEqual(EMAIL_TEMPLATE_BOOTSTRAP.signup_received);
	});

	it('returns null for an unknown event key', () => {
		expect(getEmailTemplateBootstrap('unknown_event')).toBeNull();
	});
});

describe('isEmailTemplateEditorDirty', () => {
	const row = EMAIL_TEMPLATE_BOOTSTRAP.signup_received;

	it('is clean when editor matches the saved row', () => {
		expect(isEmailTemplateEditorDirty({ ...row }, row)).toBe(false);
	});

	it('is dirty when the subject changed', () => {
		expect(isEmailTemplateEditorDirty({ ...row, subject: 'Andere' }, row)).toBe(true);
	});
});

describe('isEmailTemplateEditorAtBootstrap', () => {
	it('is true when editor matches bootstrap', () => {
		expect(isEmailTemplateEditorAtBootstrap({ ...EMAIL_TEMPLATE_BOOTSTRAP.trial_scheduled }, 'trial_scheduled')).toBe(
			true,
		);
	});

	it('is false when body differs from bootstrap', () => {
		expect(
			isEmailTemplateEditorAtBootstrap(
				{ ...EMAIL_TEMPLATE_BOOTSTRAP.trial_scheduled, body_markdown: 'anders' },
				'trial_scheduled',
			),
		).toBe(false);
	});
});
