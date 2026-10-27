import { describe, expect, it } from 'bun:test';
import { parseIdMapJson } from './idMapFileHelpers';

describe('parseIdMapJson', () => {
	it('rejects arrays and null', () => {
		expect(() => parseIdMapJson([], 'map.json')).toThrow('Invalid id-map JSON');
		expect(() => parseIdMapJson(null, 'map.json')).toThrow('Invalid id-map JSON');
	});
});
