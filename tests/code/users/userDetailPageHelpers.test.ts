import { describe, expect, it } from 'bun:test';
import { mapUserDetailQueriesToOutcome, resolveUserDetailScreen } from '../../../src/lib/users/userDetailPageHelpers';

const user = {
	user_id: 'u-1',
	email: 'anna@example.com',
	first_name: 'Anna',
	last_name: 'Bakker',
	phone_number: null,
	avatar_url: null,
	created_at: '2024-01-01T00:00:00Z',
	last_sign_in_at: null,
	role: 'staff' as const,
	street_name: null,
	house_number: null,
	postal_code: null,
	city: null,
	country_code: null,
};

const profile = {
	user_id: 'u-1',
	email: 'anna@example.com',
	first_name: 'Anna',
	last_name: 'Bakker',
	phone_number: null,
	avatar_url: null,
	created_at: '2024-01-01T00:00:00Z',
	street_name: null,
	house_number: null,
	postal_code: null,
	city: null,
	country_code: null,
};

const baseGate = {
	tabRedirectTo: null as string | null,
	authLoading: false,
	hasAccess: true,
	loading: false,
	user: null as typeof user | null,
	notFound: false,
};

describe('resolveUserDetailScreen', () => {
	it('navigates when the URL tab segment needs a redirect', () => {
		expect(
			resolveUserDetailScreen({
				...baseGate,
				tabRedirectTo: '/users/u-1/profile',
			}),
		).toEqual({ kind: 'navigate', to: '/users/u-1/profile' });
	});

	it('shows loading while auth is loading or while an allowed fetch is in flight', () => {
		expect(
			resolveUserDetailScreen({
				...baseGate,
				authLoading: true,
			}),
		).toEqual({ kind: 'loading' });

		expect(
			resolveUserDetailScreen({
				...baseGate,
				loading: true,
			}),
		).toEqual({ kind: 'loading' });
	});

	it('navigates home when the viewer has no access', () => {
		expect(
			resolveUserDetailScreen({
				...baseGate,
				hasAccess: false,
			}),
		).toEqual({ kind: 'navigate', to: '/' });
	});

	it('navigates to the users list when the user is missing after load', () => {
		expect(
			resolveUserDetailScreen({
				...baseGate,
				notFound: true,
			}),
		).toEqual({ kind: 'navigate', to: '/users' });
	});

	it('returns ready with the loaded user', () => {
		expect(
			resolveUserDetailScreen({
				...baseGate,
				user,
			}),
		).toEqual({ kind: 'ready', user });
	});
});

describe('mapUserDetailQueriesToOutcome', () => {
	it('prefers the profile error message when both queries fail', () => {
		expect(
			mapUserDetailQueriesToOutcome(
				{ data: null, error: { message: 'profile-failed' } },
				{ data: null, error: { message: 'role-failed' } },
			),
		).toEqual({
			outcome: { kind: 'error' },
			toastDescription: 'profile-failed',
		});
	});

	it('uses the role error when the profile query succeeded', () => {
		expect(
			mapUserDetailQueriesToOutcome(
				{ data: profile, error: null },
				{ data: null, error: { message: 'role-failed' } },
			),
		).toEqual({
			outcome: { kind: 'error' },
			toastDescription: 'role-failed',
		});
	});

	it('returns not-found when the profile row is missing', () => {
		expect(mapUserDetailQueriesToOutcome({ data: null, error: null }, { data: null, error: null })).toEqual({
			outcome: { kind: 'not-found' },
			toastDescription: null,
		});
	});

	it('returns success without toast text when both queries succeed', () => {
		expect(
			mapUserDetailQueriesToOutcome({ data: profile, error: null }, { data: { role: 'staff' }, error: null }),
		).toEqual({
			outcome: { kind: 'success', user },
			toastDescription: null,
		});
	});
});
