import { describe, expect, it } from 'bun:test';
import {
	buildAgreementsTabLabel,
	buildPersonDetailPath,
	buildTeacherDetailTabItems,
	parsePersonDetailTab,
	resolvePersonDetailTabRedirect,
	resolvePersonDetailTabRoute,
} from '../../../src/lib/profile/personDetailTabsHelpers';

describe('parsePersonDetailTab', () => {
	it('returns profile for missing or invalid tabs', () => {
		expect(parsePersonDetailTab(undefined)).toBe('profile');
		expect(parsePersonDetailTab('unknown')).toBe('profile');
	});

	it('keeps valid tab ids', () => {
		expect(parsePersonDetailTab('address')).toBe('address');
		expect(parsePersonDetailTab('agreements')).toBe('agreements');
		expect(parsePersonDetailTab('agenda')).toBe('agenda');
	});
});

describe('person detail tab routes', () => {
	it('builds paths from a base path and tab', () => {
		expect(resolvePersonDetailTabRoute('/users/u-1', 'agenda')).toBe('/users/u-1/agenda');
		expect(buildPersonDetailPath('/users/u-1')).toBe('/users/u-1/profile');
		expect(buildPersonDetailPath('/users/u-1', 'address')).toBe('/users/u-1/address');
	});

	it('redirects when the tab segment is missing or invalid', () => {
		expect(resolvePersonDetailTabRedirect('/users/u-1', undefined)).toBe('/users/u-1/profile');
		expect(resolvePersonDetailTabRedirect('/users/u-1', 'nope')).toBe('/users/u-1/profile');
		expect(resolvePersonDetailTabRedirect('/users/u-1', 'profile')).toBeNull();
	});
});

describe('teacher detail tab items', () => {
	it('includes the agreements count in the Lesovereenkomsten label', () => {
		expect(buildAgreementsTabLabel(3)).toBe('Lesovereenkomsten (3)');
		expect(buildTeacherDetailTabItems(3).find((item) => item.value === 'agreements')?.label).toBe(
			'Lesovereenkomsten (3)',
		);
	});
});
