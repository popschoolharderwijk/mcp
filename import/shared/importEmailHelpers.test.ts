import { describe, expect, it } from 'bun:test';
import { allocateImportEmail, createImportEmailDedupState } from './importEmailHelpers';

describe('allocateImportEmail', () => {
	it('keeps the first email as owner and marks later ones as shared members', () => {
		const state = createImportEmailDedupState();
		expect(allocateImportEmail(state, 'Shared@example.com', 'oid-1')).toEqual({
			email: 'Shared@example.com',
			kind: 'owner',
			warning: null,
		});
		expect(allocateImportEmail(state, 'shared@example.com', 'oid-2')).toEqual({
			email: null,
			kind: 'shared_member',
			warning: 'Shared login email "shared@example.com"; attaching as member under existing login',
		});
		expect(allocateImportEmail(state, 'SHARED@example.com', 'oid-3')).toEqual({
			email: null,
			kind: 'shared_member',
			warning: 'Shared login email "SHARED@example.com"; attaching as member under existing login',
		});
	});

	it('uses the mongo oid in the missing-email placeholder and warning', () => {
		expect(allocateImportEmail(createImportEmailDedupState(), null, '65deed9e3f515bbe5a0ecbe0')).toEqual({
			email: 'missing_65deed9e3f515bbe5a0ecbe0@example.com',
			kind: 'missing',
			warning: 'Missing email; using "missing_65deed9e3f515bbe5a0ecbe0@example.com"',
		});
	});
});
