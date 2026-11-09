import { describe, expect, it } from 'bun:test';
import {
	applyAccountProfileLoadResult,
	buildAccountPageUserInitials,
	createInitialAccountFormData,
	isAccountTab,
	resolveAccountTabRoute,
} from '../../../src/lib/account/accountPageControllerHelpers';

describe('createInitialAccountFormData', () => {
	it('returns empty profile fields', () => {
		expect(createInitialAccountFormData()).toEqual({
			first_name: '',
			last_name: '',
			phone_number: '',
		});
	});
});

describe('resolveAccountTabRoute', () => {
	it('maps account tabs to routes', () => {
		expect(resolveAccountTabRoute('profile')).toBe('/account/profile');
		expect(resolveAccountTabRoute('appearance')).toBe('/account/appearance');
		expect(resolveAccountTabRoute('security')).toBe('/account/security');
		expect(resolveAccountTabRoute('danger')).toBe('/account/danger');
	});
});

describe('isAccountTab', () => {
	it('accepts known account tabs and rejects others', () => {
		expect(isAccountTab('security')).toBe(true);
		expect(isAccountTab('billing')).toBe(false);
	});
});

describe('applyAccountProfileLoadResult', () => {
	it('returns null profile and form when data is missing', () => {
		expect(applyAccountProfileLoadResult(null)).toEqual({
			profile: null,
			formData: null,
		});
	});

	it('maps loaded profile to form state', () => {
		expect(
			applyAccountProfileLoadResult({
				first_name: 'Ada',
				last_name: 'Lovelace',
				phone_number: '0612345678',
				avatar_url: null,
			}),
		).toEqual({
			profile: {
				first_name: 'Ada',
				last_name: 'Lovelace',
				phone_number: '0612345678',
				avatar_url: null,
			},
			formData: {
				first_name: 'Ada',
				last_name: 'Lovelace',
				phone_number: '0612345678',
			},
		});
	});
});

describe('buildAccountPageUserInitials', () => {
	it('builds initials from profile names', () => {
		expect(
			buildAccountPageUserInitials(
				{ email: 'ada@test.nl' },
				{ first_name: 'Ada', last_name: 'Lovelace', phone_number: null, avatar_url: null },
			),
		).toBe('AL');
	});
});
