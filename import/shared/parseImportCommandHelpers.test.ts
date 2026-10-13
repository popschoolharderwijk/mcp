import { describe, expect, it } from 'bun:test';
import { importUsage, parseImportCommand } from './parseImportCommandHelpers';

describe('parseImportCommand', () => {
	it('accepts a known converter with no extra args', () => {
		expect(parseImportCommand(['bun', 'import/index.ts', 'teachers'], ['teachers'])).toEqual({
			ok: true,
			names: ['teachers'],
		});
	});

	it('accepts all and expands to every converter name', () => {
		expect(parseImportCommand(['bun', 'import/index.ts', 'all'], ['teachers', 'students'])).toEqual({
			ok: true,
			names: ['teachers', 'students'],
		});
	});

	it('rejects missing, unknown, or extra args', () => {
		expect(parseImportCommand(['bun', 'import/index.ts'], ['teachers']).ok).toBe(false);
		expect(parseImportCommand(['bun', 'import/index.ts', 'nope'], ['teachers']).ok).toBe(false);
		expect(parseImportCommand(['bun', 'import/index.ts', 'teachers', 'extra'], ['teachers']).ok).toBe(false);
		expect(parseImportCommand(['bun', 'import/index.ts', 'all', 'extra'], ['teachers']).ok).toBe(false);
		expect(importUsage(['teachers'])).toBe('Usage: bun import <all|teachers>');
	});
});
