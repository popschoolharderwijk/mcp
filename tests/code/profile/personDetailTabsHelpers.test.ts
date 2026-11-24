import { describe, expect, it } from 'bun:test';
import {
	buildPersonDetailPath,
	buildPersonDetailTabItems,
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

	it('rejects agenda when includeAgenda is false', () => {
		expect(parsePersonDetailTab('agenda', { includeAgenda: false })).toBe('profile');
		expect(parsePersonDetailTab('address', { includeAgenda: false })).toBe('address');
	});
});

describe('person detail tab routes', () => {
	it('builds paths from a base path and tab', () => {
		expect(resolvePersonDetailTabRoute('/users/u-1', 'agenda')).toBe('/users/u-1/agenda');
		expect(buildPersonDetailPath('/users/u-1')).toBe('/users/u-1/profile');
		expect(buildPersonDetailPath('/users/u-1', 'address')).toBe('/users/u-1/address');
	});

	it('uses bare /profile for the default own-profile tab', () => {
		expect(resolvePersonDetailTabRoute('/profile', 'profile')).toBe('/profile');
		expect(resolvePersonDetailTabRoute('/profile', 'address')).toBe('/profile/address');
		expect(buildPersonDetailPath('/profile')).toBe('/profile');
	});

	it('redirects when the tab segment is missing or invalid', () => {
		expect(resolvePersonDetailTabRedirect('/users/u-1', undefined)).toBe('/users/u-1/profile');
		expect(resolvePersonDetailTabRedirect('/users/u-1', 'nope')).toBe('/users/u-1/profile');
		expect(resolvePersonDetailTabRedirect('/users/u-1', 'profile')).toBeNull();
	});

	it('keeps bare /profile and collapses /profile/profile', () => {
		expect(resolvePersonDetailTabRedirect('/profile', undefined)).toBeNull();
		expect(resolvePersonDetailTabRedirect('/profile', 'profile')).toBe('/profile');
		expect(resolvePersonDetailTabRedirect('/profile', 'address')).toBeNull();
		expect(resolvePersonDetailTabRedirect('/profile', 'agenda', { includeAgenda: false })).toBe('/profile');
	});
});

describe('teacher detail tab items', () => {
	it('places availability after agreements with block counts and omits agenda when includeAgenda is false', () => {
		const withAgenda = buildTeacherDetailTabItems(3, 2);
		expect(withAgenda.map((item) => item.value)).toEqual([
			'profile',
			'address',
			'agreements',
			'availability',
			'agenda',
		]);
		expect(withAgenda.find((item) => item.value === 'agreements')?.label).toBe('Lesovereenkomsten (3)');
		expect(withAgenda.find((item) => item.value === 'availability')?.label).toBe('Beschikbaarheid (2)');
		expect(buildTeacherDetailTabItems(0, 0, { includeAgenda: false }).map((item) => item.value)).toEqual([
			'profile',
			'address',
			'agreements',
			'availability',
		]);
		expect(buildPersonDetailTabItems({ includeAgenda: false }).some((item) => item.value === 'agenda')).toBe(false);
	});
});
