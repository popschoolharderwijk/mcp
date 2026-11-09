import { describe, expect, it } from 'bun:test';
import {
	buildMandatesTabItems,
	parseMandatesTab,
	resolveMandatesAccess,
	resolveMandatesTabRedirect,
} from '../../../src/lib/subscriptions/mandatesTabsHelpers';

describe('mandatesTabsHelpers', () => {
	it('defaults unknown tabs to active and redirects only when the URL must change', () => {
		expect(parseMandatesTab(undefined)).toBe('active');
		expect(parseMandatesTab('arranged')).toBe('active');
		expect(resolveMandatesTabRedirect('inactive')).toBeNull();
		expect(resolveMandatesTabRedirect(undefined)).toBe('/mandates/active');
		expect(resolveMandatesTabRedirect('arranged')).toBe('/mandates/active');
	});

	it('appends counts to tab labels in Actief → Inactief → In afwachting → Niet verstuurd order', () => {
		expect(buildMandatesTabItems(null).map((item) => item.label)).toEqual([
			'Actief',
			'Inactief',
			'In afwachting',
			'Niet verstuurd',
		]);
		expect(
			buildMandatesTabItems({
				active: 3,
				inactive: 1,
				pending: 2,
				unsent: 0,
			}).map((item) => item.label),
		).toEqual(['Actief (3)', 'Inactief (1)', 'In afwachting (2)', 'Niet verstuurd (0)']);
	});

	it('resolves access with auth, forbidden, and redirect taking priority over ok', () => {
		expect(resolveMandatesAccess(true, true, null)).toEqual({ kind: 'auth-loading' });
		expect(resolveMandatesAccess(false, false, null)).toEqual({ kind: 'forbidden' });
		expect(resolveMandatesAccess(false, true, '/mandates/active')).toEqual({
			kind: 'redirect',
			to: '/mandates/active',
		});
		expect(resolveMandatesAccess(false, true, null)).toEqual({ kind: 'ok' });
	});
});
