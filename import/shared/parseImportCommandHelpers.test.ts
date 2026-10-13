import { describe, expect, it } from 'bun:test';
import { importUsage, parseImportCommand } from './parseImportCommandHelpers';

describe('parseImportCommand', () => {
	it('accepts a known converter with no extra args', () => {
		expect(parseImportCommand(['bun', 'import/index.ts', 'teachers'], ['teachers'])).toEqual({
			ok: true,
			names: ['teachers'],
			upload: false,
		});
	});

	it('accepts all and expands to every converter name', () => {
		expect(parseImportCommand(['bun', 'import/index.ts', 'all'], ['teachers', 'students'])).toEqual({
			ok: true,
			names: ['teachers', 'students'],
			upload: false,
		});
	});

	it('accepts --upload after a converter or alone', () => {
		expect(parseImportCommand(['bun', 'import/index.ts', 'all', '--upload'], ['teachers'])).toEqual({
			ok: true,
			names: ['teachers'],
			upload: true,
		});
		expect(parseImportCommand(['bun', 'import/index.ts', '--upload', 'teachers'], ['teachers'])).toEqual({
			ok: true,
			names: ['teachers'],
			upload: true,
		});
		expect(parseImportCommand(['bun', 'import/index.ts', '--upload'], ['teachers'])).toEqual({
			ok: true,
			names: [],
			upload: true,
		});
	});

	it('rejects missing, unknown, or invalid args', () => {
		expect(parseImportCommand(['bun', 'import/index.ts'], ['teachers']).ok).toBe(false);
		expect(parseImportCommand(['bun', 'import/index.ts', 'nope'], ['teachers']).ok).toBe(false);
		expect(parseImportCommand(['bun', 'import/index.ts', 'teachers', 'extra'], ['teachers']).ok).toBe(false);
		expect(parseImportCommand(['bun', 'import/index.ts', 'all', 'extra'], ['teachers']).ok).toBe(false);
		expect(parseImportCommand(['bun', 'import/index.ts', '--upload', '--upload'], ['teachers']).ok).toBe(false);
		expect(parseImportCommand(['bun', 'import/index.ts', '--weird'], ['teachers']).ok).toBe(false);
		expect(importUsage(['teachers'])).toBe(
			'Usage: bun import <all|teachers> [--upload]\n       bun import --upload',
		);
	});
});
