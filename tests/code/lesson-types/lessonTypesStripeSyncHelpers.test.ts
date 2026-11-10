import { describe, expect, it } from 'bun:test';
import {
	lessonTypeStripeSyncStatusLabel,
	lessonTypeStripeSyncStatusVariant,
	lessonTypesHaveUnsyncedStripeCatalog,
	rollupLessonTypeStripeSyncStatus,
} from '../../../src/lib/lesson-types/lessonTypesStripeSyncHelpers';

describe('rollupLessonTypeStripeSyncStatus', () => {
	it('returns synced when there are no options', () => {
		expect(rollupLessonTypeStripeSyncStatus([])).toBe('synced');
	});

	it('returns error when any option failed', () => {
		expect(rollupLessonTypeStripeSyncStatus(['synced', 'error', 'pending'])).toBe('error');
	});

	it('returns pending when any option is waiting and none failed', () => {
		expect(rollupLessonTypeStripeSyncStatus(['synced', 'pending'])).toBe('pending');
	});

	it('returns synced when every option is synced', () => {
		expect(rollupLessonTypeStripeSyncStatus(['synced', 'synced'])).toBe('synced');
	});
});

describe('lessonTypesHaveUnsyncedStripeCatalog', () => {
	it('is false when every lesson type is synced', () => {
		expect(
			lessonTypesHaveUnsyncedStripeCatalog([{ stripe_sync_status: 'synced' }, { stripe_sync_status: 'synced' }]),
		).toBe(false);
	});

	it('is true when any lesson type is pending or error', () => {
		expect(lessonTypesHaveUnsyncedStripeCatalog([{ stripe_sync_status: 'pending' }])).toBe(true);
		expect(lessonTypesHaveUnsyncedStripeCatalog([{ stripe_sync_status: 'error' }])).toBe(true);
	});
});

describe('lesson type Stripe status presentation', () => {
	it('maps statuses to Dutch labels and badge variants', () => {
		expect(lessonTypeStripeSyncStatusLabel('synced')).toBe('Gesynchroniseerd');
		expect(lessonTypeStripeSyncStatusLabel('pending')).toBe('In afwachting');
		expect(lessonTypeStripeSyncStatusLabel('error')).toBe('Fout');
		expect(lessonTypeStripeSyncStatusVariant('synced')).toBe('default');
		expect(lessonTypeStripeSyncStatusVariant('pending')).toBe('secondary');
		expect(lessonTypeStripeSyncStatusVariant('error')).toBe('destructive');
	});
});
