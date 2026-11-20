import { describe, expect, it } from 'bun:test';
import {
	joinMembershipsWithProfiles,
	mapMembershipProfilesForPicker,
	membershipProfileDisplayName,
	membershipProfileInitials,
	shouldShowProfilePicker,
} from '../../../src/lib/auth/profilePickerHelpers';

describe('shouldShowProfilePicker', () => {
	it('hides picker for a single membership', () => {
		expect(
			shouldShowProfilePicker({
				membershipCount: 1,
				profileSelectionCompletedThisSession: false,
			}),
		).toBe(false);
	});

	it('shows picker for multiple memberships until a pick this session', () => {
		expect(
			shouldShowProfilePicker({
				membershipCount: 3,
				profileSelectionCompletedThisSession: false,
			}),
		).toBe(true);
	});

	it('hides picker after the user picked this session', () => {
		expect(
			shouldShowProfilePicker({
				membershipCount: 3,
				profileSelectionCompletedThisSession: true,
			}),
		).toBe(false);
	});
});

describe('membershipProfileDisplayName', () => {
	it('joins first and last name', () => {
		expect(membershipProfileDisplayName('Emma', 'de Vries')).toBe('Emma de Vries');
	});

	it('falls back when names are empty', () => {
		expect(membershipProfileDisplayName(null, null)).toBe('Profiel');
	});
});

describe('mapMembershipProfilesForPicker', () => {
	it('maps rows to display profiles with display names', () => {
		expect(
			mapMembershipProfilesForPicker([
				{
					profile_id: 'p1',
					role: 'owner',
					first_name: 'Karin',
					last_name: 'de Vries',
					avatar_url: null,
				},
				{
					profile_id: 'p2',
					role: 'member',
					first_name: 'Emma',
					last_name: null,
					avatar_url: 'https://example.com/a.png',
				},
			]),
		).toEqual([
			{
				profileId: 'p1',
				role: 'owner',
				firstName: 'Karin',
				lastName: 'de Vries',
				avatarUrl: null,
				displayName: 'Karin de Vries',
			},
			{
				profileId: 'p2',
				role: 'member',
				firstName: 'Emma',
				lastName: null,
				avatarUrl: 'https://example.com/a.png',
				displayName: 'Emma',
			},
		]);
	});
});

describe('membershipProfileInitials', () => {
	it('uses two name parts', () => {
		expect(membershipProfileInitials('Emma de Vries')).toBe('ED');
	});

	it('uses two letters from a single name', () => {
		expect(membershipProfileInitials('Emma')).toBe('EM');
	});
});

describe('joinMembershipsWithProfiles', () => {
	it('fills missing profile fields with null', () => {
		expect(
			joinMembershipsWithProfiles(
				[{ profile_id: 'p1', role: 'member' }],
				[{ user_id: 'p2', first_name: 'X', last_name: 'Y', avatar_url: null }],
			),
		).toEqual([
			{
				profileId: 'p1',
				role: 'member',
				firstName: null,
				lastName: null,
				avatarUrl: null,
				displayName: 'Profiel',
			},
		]);
	});
});
