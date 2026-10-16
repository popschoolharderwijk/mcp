import { describe, expect, it } from 'bun:test';
import { idMapFromMissingFile, parseIdMapJson } from './idMapFileHelpers';

describe('parseIdMapJson', () => {
	it('accepts an object map', () => {
		expect(parseIdMapJson({ teacher: { a: 'b' } }, 'map.json')).toEqual({
			teacher: { a: 'b' },
		});
	});

	it('rejects arrays and null', () => {
		expect(() => parseIdMapJson([], 'map.json')).toThrow('Invalid id-map JSON');
		expect(() => parseIdMapJson(null, 'map.json')).toThrow('Invalid id-map JSON');
	});
});

describe('idMapFromMissingFile', () => {
	it('returns an empty map', () => {
		expect(idMapFromMissingFile()).toEqual({});
	});
});
