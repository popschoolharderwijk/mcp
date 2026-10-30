import { describe, expect, it } from 'bun:test';
import {
	pickLessonTypeIdForRebuild,
	shouldRebuildAfterCatalogSync,
	validateSyncCatalogBody,
} from '../../../supabase/functions/sync-stripe-catalog/validation';

describe('sync-stripe-catalog validation', () => {
	it('accepts an empty body', () => {
		expect(validateSyncCatalogBody({})).toBeNull();
	});

	it('rejects invalid uuids', () => {
		const response = validateSyncCatalogBody({ lesson_type_id: 'not-a-uuid' });
		expect(response).not.toBeNull();
		expect(response?.status).toBe(400);
	});

	it('rebuilds by default when a lesson type or option is targeted', () => {
		expect(shouldRebuildAfterCatalogSync({ lesson_type_id: '11111111-1111-1111-1111-111111111111' })).toBe(true);
		expect(
			shouldRebuildAfterCatalogSync({ rebuild: false, lesson_type_id: '11111111-1111-1111-1111-111111111111' }),
		).toBe(false);
		expect(shouldRebuildAfterCatalogSync({})).toBe(false);
	});

	it('picks lesson type id for rebuild from body or option lookup', () => {
		expect(pickLessonTypeIdForRebuild({ lesson_type_id: 'lt-1' }, 'lt-from-option')).toBe('lt-1');
		expect(pickLessonTypeIdForRebuild({}, 'lt-from-option')).toBe('lt-from-option');
		expect(pickLessonTypeIdForRebuild({}, null)).toBeNull();
	});
});
