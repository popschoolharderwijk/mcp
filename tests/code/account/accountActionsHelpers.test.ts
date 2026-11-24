import { describe, expect, it } from 'bun:test';
import { resolveDeleteAccountToastKind } from '../../../src/lib/account/accountActionsHelpers';

describe('resolveDeleteAccountToastKind', () => {
	it('maps known delete account errors', () => {
		expect(resolveDeleteAccountToastKind('last admin', 'last_site_admin')).toBe('last-site-admin');
		expect(resolveDeleteAccountToastKind('Sessie verlopen')).toBe('session-expired');
		expect(resolveDeleteAccountToastKind('other')).toBe('generic-error');
	});
});
