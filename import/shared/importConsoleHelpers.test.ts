import { describe, expect, it } from 'bun:test';
import { prefixImportConsoleLines } from './importConsoleHelpers';

describe('prefixImportConsoleLines', () => {
	it('prefixes each non-empty line with the same clock stamp', () => {
		const now = new Date(2026, 9, 30, 12, 3, 4);
		expect(prefixImportConsoleLines('Wrote out/a.sql\nUpdated id-map.json', now)).toBe(
			'[12:03:04] Wrote out/a.sql\n[12:03:04] Updated id-map.json',
		);
	});

	it('leaves blank lines unprefixed for visual spacing', () => {
		const now = new Date(2026, 9, 30, 8, 0, 1);
		expect(prefixImportConsoleLines('\n═══\n courses \n═══', now)).toBe(
			'\n[08:00:01] ═══\n[08:00:01]  courses \n[08:00:01] ═══',
		);
	});
});
