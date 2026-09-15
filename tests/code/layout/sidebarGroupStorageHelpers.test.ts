import { describe, expect, it } from 'bun:test';
import { sidebarGroupOpenStorageKey } from '../../../src/lib/layout/sidebarGroupStorageHelpers';

describe('sidebarGroupOpenStorageKey', () => {
	it('builds a storage key from the group key', () => {
		expect(sidebarGroupOpenStorageKey('finance')).toBe('sidebar:group-open:finance');
		expect(sidebarGroupOpenStorageKey('admin-section')).toBe('sidebar:group-open:admin-section');
	});
});
