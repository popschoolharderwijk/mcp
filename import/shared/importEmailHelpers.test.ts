import { describe, expect, it } from 'bun:test';
import { allocateImportEmail, createImportEmailDedupState } from './importEmailHelpers';

describe('allocateImportEmail', () => {
	it('keeps the first email and renames later duplicates with a replacement warning', () => {
		const state = createImportEmailDedupState();
		expect(allocateImportEmail(state, 'Shared@example.com', 'oid-1')).toEqual({
			email: 'Shared@example.com',
			warning: null,
		});
		expect(allocateImportEmail(state, 'shared@example.com', 'oid-2')).toEqual({
			email: 'duplicate_1_shared@example.com',
			warning: 'Duplicate email "shared@example.com"; using "duplicate_1_shared@example.com"',
		});
		expect(allocateImportEmail(state, 'SHARED@example.com', 'oid-3')).toEqual({
			email: 'duplicate_2_SHARED@example.com',
			warning: 'Duplicate email "SHARED@example.com"; using "duplicate_2_SHARED@example.com"',
		});
	});

	it('uses the mongo oid in the missing-email placeholder and warning', () => {
		expect(allocateImportEmail(createImportEmailDedupState(), null, '65deed9e3f515bbe5a0ecbe0')).toEqual({
			email: 'missing_65deed9e3f515bbe5a0ecbe0@example.com',
			warning: 'Missing email; using "missing_65deed9e3f515bbe5a0ecbe0@example.com"',
		});
	});
});
