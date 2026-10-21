import { describe, expect, it } from 'bun:test';
import { resolveFaviconSrc } from '../../../src/lib/configure-favicon';

describe('resolveFaviconSrc', () => {
	it('maps each Vite mode to its favicon', () => {
		expect(resolveFaviconSrc('production')).toBe('/favicon.svg');
		expect(resolveFaviconSrc('development')).toBe('/favicon-local.svg');
		expect(resolveFaviconSrc('localdev')).toBe('/favicon-localdev.svg');
		expect(resolveFaviconSrc(undefined)).toBe('/favicon.svg');
	});
});
