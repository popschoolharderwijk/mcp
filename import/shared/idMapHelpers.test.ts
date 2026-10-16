import { describe, expect, it } from 'bun:test';
import { createEmptyIdMap, ensureMappedId, getMappedId, setMappedId } from './idMapHelpers';

describe('idMapHelpers', () => {
	it('sets and gets mapped ids', () => {
		const map = setMappedId(createEmptyIdMap(), 'teacher', 'oid-1', 'uuid-1');
		expect(getMappedId(map, 'teacher', 'oid-1')).toBe('uuid-1');
		expect(getMappedId(map, 'teacher', 'missing')).toBeUndefined();
	});

	it('reuses an existing mapping', () => {
		const initial = setMappedId(createEmptyIdMap(), 'teacher', 'oid-1', 'uuid-1');
		const result = ensureMappedId(initial, 'teacher', 'oid-1', () => 'uuid-new');
		expect(result.created).toBe(false);
		expect(result.id).toBe('uuid-1');
		expect(result.map).toEqual(initial);
	});

	it('creates a new mapping when missing', () => {
		const result = ensureMappedId(createEmptyIdMap(), 'teacher', 'oid-2', () => 'uuid-2');
		expect(result.created).toBe(true);
		expect(result.id).toBe('uuid-2');
		expect(getMappedId(result.map, 'teacher', 'oid-2')).toBe('uuid-2');
	});
});
