import { describe, expect, it } from 'bun:test';
import {
	isDefinedTemplateVar,
	isValidTemplateRecipient,
	normalizeTemplateVars,
	renderTemplate,
	resolveSendTemplateEmailEventKeyError,
	resolveSendTemplateEmailRecipientError,
	validateSendTemplateEmailBodyInput,
} from '../../../supabase/functions/_shared/send-template-email-helpers';

describe('isDefinedTemplateVar', () => {
	it('returns true for string and number values', () => {
		expect(isDefinedTemplateVar('Jan')).toBe(true);
		expect(isDefinedTemplateVar(42)).toBe(true);
	});

	it('returns false for null and undefined values', () => {
		expect(isDefinedTemplateVar(null)).toBe(false);
		expect(isDefinedTemplateVar(undefined)).toBe(false);
	});
});

describe('normalizeTemplateVars', () => {
	it('returns empty object for undefined input', () => {
		expect(normalizeTemplateVars(undefined)).toEqual({});
	});

	it('skips null and undefined values', () => {
		expect(normalizeTemplateVars({ name: 'Jan', age: null, city: undefined })).toEqual({ name: 'Jan' });
	});

	it('stringifies numeric values', () => {
		expect(normalizeTemplateVars({ count: 3 })).toEqual({ count: '3' });
	});
});

describe('isValidTemplateRecipient', () => {
	it('accepts valid email addresses', () => {
		expect(isValidTemplateRecipient('jan@test.nl')).toBe(true);
	});

	it('rejects invalid email addresses', () => {
		expect(isValidTemplateRecipient('not-an-email')).toBe(false);
	});
});

describe('resolveSendTemplateEmailEventKeyError', () => {
	it('returns error when event key is missing', () => {
		expect(resolveSendTemplateEmailEventKeyError(undefined)).toBe('event_key vereist');
	});

	it('returns null when event key is present', () => {
		expect(resolveSendTemplateEmailEventKeyError('welcome')).toBeNull();
	});
});

describe('resolveSendTemplateEmailRecipientError', () => {
	it('returns error when recipient is invalid', () => {
		expect(resolveSendTemplateEmailRecipientError('invalid')).toBe('Ongeldig e-mailadres');
	});

	it('returns null when recipient is valid', () => {
		expect(resolveSendTemplateEmailRecipientError('jan@test.nl')).toBeNull();
	});
});

describe('validateSendTemplateEmailBodyInput', () => {
	it('returns event key error first', () => {
		expect(validateSendTemplateEmailBodyInput({ event_key: '', to: 'jan@test.nl' })).toBe('event_key vereist');
	});

	it('returns recipient error when event key is valid', () => {
		expect(validateSendTemplateEmailBodyInput({ event_key: 'welcome', to: 'invalid' })).toBe(
			'Ongeldig e-mailadres',
		);
	});

	it('returns null for valid body input', () => {
		expect(validateSendTemplateEmailBodyInput({ event_key: 'welcome', to: 'jan@test.nl' })).toBeNull();
	});
});

describe('renderTemplate', () => {
	it('replaces known placeholders', () => {
		expect(renderTemplate('Hallo {{ name }}', { name: 'Jan' })).toBe('Hallo Jan');
	});

	it('keeps unknown placeholders unchanged', () => {
		expect(renderTemplate('Hallo {{ name }}', {})).toBe('Hallo {{ name }}');
	});
});
