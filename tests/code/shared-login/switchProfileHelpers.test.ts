import { describe, expect, it } from 'bun:test';
import {
	buildActiveProfileAppMetadata,
	parseSwitchProfileBody,
	resolveSwitchMembershipGate,
	resolveSwitchProfileUpdateGate,
} from '../../../supabase/functions/switch-profile/switchProfileHelpers';

describe('parseSwitchProfileBody', () => {
	it('accepts a valid profile_id', () => {
		expect(parseSwitchProfileBody({ profile_id: '11111111-1111-1111-1111-111111111111' })).toEqual({
			ok: true,
			profileId: '11111111-1111-1111-1111-111111111111',
		});
	});

	it('rejects missing profile_id', () => {
		expect(parseSwitchProfileBody({})).toEqual({ ok: false, error: 'profile_id is verplicht' });
	});

	it('rejects invalid uuid', () => {
		expect(parseSwitchProfileBody({ profile_id: 'not-a-uuid' })).toEqual({
			ok: false,
			error: 'profile_id is verplicht',
		});
	});
});

describe('buildActiveProfileAppMetadata', () => {
	it('sets active_profile_id and keeps existing app_metadata keys', () => {
		expect(buildActiveProfileAppMetadata({ provider: 'email' }, '22222222-2222-2222-2222-222222222222')).toEqual({
			provider: 'email',
			active_profile_id: '22222222-2222-2222-2222-222222222222',
		});
	});

	it('works when existing metadata is missing', () => {
		expect(buildActiveProfileAppMetadata(undefined, '22222222-2222-2222-2222-222222222222')).toEqual({
			active_profile_id: '22222222-2222-2222-2222-222222222222',
		});
	});
});

describe('resolveSwitchMembershipGate', () => {
	it('allows when membership row exists', () => {
		expect(resolveSwitchMembershipGate({ profile_id: 'p1' }, null)).toEqual({ ok: true });
	});

	it('forbids when membership is missing', () => {
		expect(resolveSwitchMembershipGate(null, null)).toEqual({
			ok: false,
			status: 403,
			error: 'Geen toegang tot dit profiel',
		});
	});

	it('returns server error when lookup fails', () => {
		expect(resolveSwitchMembershipGate(null, { message: 'db' })).toEqual({
			ok: false,
			status: 500,
			error: 'Kon lidmaatschap niet controleren',
		});
	});
});

describe('resolveSwitchProfileUpdateGate', () => {
	it('allows when user was updated', () => {
		expect(resolveSwitchProfileUpdateGate({ id: 'u1' }, null)).toEqual({ ok: true });
	});

	it('returns server error when update fails', () => {
		expect(resolveSwitchProfileUpdateGate(null, { message: 'auth' })).toEqual({
			ok: false,
			status: 500,
			error: 'Kon actief profiel niet instellen',
		});
	});

	it('returns server error when user payload is missing', () => {
		expect(resolveSwitchProfileUpdateGate(undefined, null)).toEqual({
			ok: false,
			status: 500,
			error: 'Kon actief profiel niet instellen',
		});
	});
});
