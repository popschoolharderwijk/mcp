import { describe, expect, it } from 'bun:test';
import { formatImportConverterBanner } from './importConsoleHelpers';

describe('formatImportConverterBanner', () => {
	it('prints a plain banner without ANSI when color is off', () => {
		const banner = formatImportConverterBanner('teachers', 0, false);
		expect(banner).toContain('teachers');
		expect(banner).toContain('═');
		expect(banner).not.toContain('\x1b[');
	});

	it('includes ANSI color codes when color is on', () => {
		const banner = formatImportConverterBanner('courses', 1, true);
		expect(banner).toContain('\x1b[');
		expect(banner).toContain('courses');
	});
});
