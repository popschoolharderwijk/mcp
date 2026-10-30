import { describe, expect, it } from 'bun:test';
import {
	buildParticipantProfileMap,
	extractParticipantUserIds,
	resolveParticipantIdLoadPlan,
	resolveParticipantProfileLoadPlan,
	shouldClearParticipantProfiles,
	shouldUseOccurrenceParticipantIds,
} from '../../../src/components/agenda/agendaEventParticipantStateHelpers';

describe('extractParticipantUserIds', () => {
	it('extracts participant user ids', () => {
		expect(extractParticipantUserIds([{ user_id: 'user-1' }, { user_id: 'user-2' }])).toEqual(['user-1', 'user-2']);
	});
});

describe('buildParticipantProfileMap', () => {
	it('maps profile rows by user id', () => {
		expect(
			buildParticipantProfileMap([
				{
					user_id: 'user-1',
					first_name: 'Anna',
					last_name: 'Bakker',
					email: 'anna@example.com',
				},
				{
					user_id: 'user-2',
					first_name: null,
					last_name: 'Jansen',
					email: 'jan@example.com',
				},
			]),
		).toEqual({
			'user-1': {
				first_name: 'Anna',
				last_name: 'Bakker',
				email: 'anna@example.com',
			},
			'user-2': {
				first_name: null,
				last_name: 'Jansen',
				email: 'jan@example.com',
			},
		});
	});

	it('returns an empty map for null or empty input', () => {
		expect(buildParticipantProfileMap(null)).toEqual({});
		expect(buildParticipantProfileMap([])).toEqual({});
	});
});

describe('shouldUseOccurrenceParticipantIds', () => {
	it('returns true for non-empty participant id lists', () => {
		expect(shouldUseOccurrenceParticipantIds(['user-1'])).toBe(true);
	});

	it('returns false for empty or missing lists', () => {
		expect(shouldUseOccurrenceParticipantIds([])).toBe(false);
		expect(shouldUseOccurrenceParticipantIds(null)).toBe(false);
	});
});

describe('shouldClearParticipantProfiles', () => {
	it('clears profiles when dialog is closed or list is empty', () => {
		expect(shouldClearParticipantProfiles(false, 2)).toBe(true);
		expect(shouldClearParticipantProfiles(true, 0)).toBe(true);
	});

	it('keeps profiles when dialog is open with participants', () => {
		expect(shouldClearParticipantProfiles(true, 2)).toBe(false);
	});
});

describe('resolveParticipantIdLoadPlan', () => {
	it('skips when dialog is closed or event id is missing', () => {
		expect(
			resolveParticipantIdLoadPlan({
				open: false,
				eventId: 'event-1',
				occurrenceParticipantIds: ['user-1'],
			}),
		).toEqual({ type: 'skip' });
		expect(
			resolveParticipantIdLoadPlan({
				open: true,
				eventId: undefined,
				occurrenceParticipantIds: ['user-1'],
			}),
		).toEqual({ type: 'skip' });
	});

	it('uses occurrence participant ids when provided', () => {
		expect(
			resolveParticipantIdLoadPlan({
				open: true,
				eventId: 'event-1',
				occurrenceParticipantIds: ['user-1', 'user-2'],
				occurrenceParticipantProfiles: {
					'user-1': { first_name: 'Anna', last_name: null, email: 'anna@example.com' },
				},
			}),
		).toEqual({
			type: 'occurrence',
			participantIds: ['user-1', 'user-2'],
			profiles: {
				'user-1': { first_name: 'Anna', last_name: null, email: 'anna@example.com' },
			},
		});
	});

	it('fetches from the database when occurrence ids are empty', () => {
		expect(
			resolveParticipantIdLoadPlan({
				open: true,
				eventId: 'event-42',
				occurrenceParticipantIds: [],
			}),
		).toEqual({ type: 'fetch', eventId: 'event-42' });
	});
});

describe('resolveParticipantProfileLoadPlan', () => {
	it('skips profile loading when dialog is closed', () => {
		expect(resolveParticipantProfileLoadPlan(false, ['user-1'])).toEqual({ type: 'skip' });
	});

	it('clears profiles when open with no participants', () => {
		expect(resolveParticipantProfileLoadPlan(true, [])).toEqual({ type: 'clear' });
	});

	it('fetches profiles when open with participants', () => {
		expect(resolveParticipantProfileLoadPlan(true, ['user-1', 'user-2'])).toEqual({
			type: 'fetch',
			participantIds: ['user-1', 'user-2'],
		});
	});
});
