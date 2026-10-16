import { describe, expect, it } from 'bun:test';
import { importUsage, parseImportCommand } from './parseImportCommandHelpers';

describe('parseImportCommand', () => {
	it('requires source and out, accepts optional --upload', () => {
		expect(parseImportCommand(['bun', 'import/index.ts', 'import/source', 'import/out'])).toEqual({
			ok: true,
			source: 'import/source',
			out: 'import/out',
			upload: false,
		});
		expect(parseImportCommand(['bun', 'import/index.ts', 'import/source', 'import/out', '--upload'])).toEqual({
			ok: true,
			source: 'import/source',
			out: 'import/out',
			upload: true,
		});
		expect(parseImportCommand(['bun', 'import/index.ts', '--upload', 'import/source', 'import/out'])).toEqual({
			ok: true,
			source: 'import/source',
			out: 'import/out',
			upload: true,
		});
	});

	it('rejects missing paths, legacy converter names, and invalid args', () => {
		expect(parseImportCommand(['bun', 'import/index.ts']).ok).toBe(false);
		expect(parseImportCommand(['bun', 'import/index.ts', 'import/source']).ok).toBe(false);
		expect(parseImportCommand(['bun', 'import/index.ts', 'teachers']).ok).toBe(false);
		expect(parseImportCommand(['bun', 'import/index.ts', 'all']).ok).toBe(false);
		expect(
			parseImportCommand(['bun', 'import/index.ts', 'import/source', 'import/out', '--upload', '--upload']).ok,
		).toBe(false);
		expect(parseImportCommand(['bun', 'import/index.ts', '--weird']).ok).toBe(false);
		expect(importUsage()).toBe('Usage: bun import <source> <out> [--upload]');
	});
});
