import { describe, expect, it } from 'bun:test';
import { importUsage, parseImportCommand } from './parseImportCommandHelpers';

describe('parseImportCommand', () => {
	it('accepts no args and --upload', () => {
		expect(parseImportCommand(['bun', 'import/index.ts'])).toEqual({ ok: true, upload: false });
		expect(parseImportCommand(['bun', 'import/index.ts', '--upload'])).toEqual({
			ok: true,
			upload: true,
		});
	});

	it('rejects legacy converter names and invalid args', () => {
		expect(parseImportCommand(['bun', 'import/index.ts', 'teachers']).ok).toBe(false);
		expect(parseImportCommand(['bun', 'import/index.ts', 'all']).ok).toBe(false);
		expect(parseImportCommand(['bun', 'import/index.ts', '--upload', '--upload']).ok).toBe(false);
		expect(parseImportCommand(['bun', 'import/index.ts', '--weird']).ok).toBe(false);
		expect(importUsage()).toBe('Usage: bun import [--upload]');
	});
});
