import { describe, expect, it } from 'bun:test';
import {
	canGenerateSepaXml,
	resolveGenerateSepaXmlForbiddenError,
} from '../../../supabase/functions/generate-sepa-xml/generateSepaXmlHandlerHelpers';

describe('canGenerateSepaXml', () => {
	it('allows admin roles', () => {
		expect(canGenerateSepaXml('admin')).toBe(true);
		expect(canGenerateSepaXml('site_admin')).toBe(true);
	});

	it('denies other roles', () => {
		expect(canGenerateSepaXml('teacher')).toBe(false);
		expect(canGenerateSepaXml(undefined)).toBe(false);
	});
});

describe('resolveGenerateSepaXmlForbiddenError', () => {
	it('returns forbidden error payload', () => {
		expect(resolveGenerateSepaXmlForbiddenError()).toEqual({
			status: 403,
			error: 'Geen rechten',
		});
	});
});
