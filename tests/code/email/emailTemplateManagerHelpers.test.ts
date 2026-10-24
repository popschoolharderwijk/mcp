import { describe, expect, it } from 'bun:test';
import {
	buildEmailTemplateRowsMap,
	mergeSavedEmailTemplateRow,
	renderEmailTemplatePreview,
} from '../../../src/lib/email/emailTemplateManagerHelpers';

describe('renderEmailTemplatePreview', () => {
	it('replaces known template variables', () => {
		expect(renderEmailTemplatePreview('Hallo {{name}}', { name: 'Jan' })).toBe('Hallo Jan');
	});

	it('leaves unknown variables unchanged', () => {
		expect(renderEmailTemplatePreview('Hallo {{name}}', {})).toBe('Hallo {{name}}');
	});
});

describe('buildEmailTemplateRowsMap', () => {
	it('indexes rows by event key', () => {
		expect(buildEmailTemplateRowsMap([{ event_key: 'signup', subject: 'Welkom', body_markdown: 'Hi' }])).toEqual({
			signup: { event_key: 'signup', subject: 'Welkom', body_markdown: 'Hi' },
		});
	});
});

describe('mergeSavedEmailTemplateRow', () => {
	it('merges editor state into the existing row', () => {
		expect(
			mergeSavedEmailTemplateRow(
				{ event_key: 'signup', subject: 'Old', body_markdown: 'Old' },
				{ subject: 'New', body_markdown: 'New' },
			),
		).toEqual({
			event_key: 'signup',
			subject: 'New',
			body_markdown: 'New',
		});
	});
});
