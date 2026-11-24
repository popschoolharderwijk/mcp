import { describe, expect, it } from 'bun:test';
import { isAccountTab } from '../../../src/lib/account/accountPageControllerHelpers';

describe('isAccountTab', () => {
	it('rejects unknown tab ids', () => {
		expect(isAccountTab('billing')).toBe(false);
	});
});
