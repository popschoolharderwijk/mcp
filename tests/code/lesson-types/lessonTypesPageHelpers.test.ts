import { describe, expect, it } from 'bun:test';
import { translateLessonTypeDeleteError } from '../../../src/lib/lesson-types/lessonTypesPageHelpers';
import { buildOptionsCountMap } from '../../../src/lib/lesson-types/lessonTypesPageMappers';

describe('buildOptionsCountMap', () => {
	it('counts options per lesson type id', () => {
		const countMap = buildOptionsCountMap([
			{ lesson_type_id: 'lt-1' },
			{ lesson_type_id: 'lt-1' },
			{ lesson_type_id: 'lt-2' },
		]);
		expect(countMap.get('lt-1')).toBe(2);
		expect(countMap.get('lt-2')).toBe(1);
	});

	it('returns an empty map for no rows', () => {
		expect(buildOptionsCountMap([]).size).toBe(0);
	});
});

describe('translateLessonTypeDeleteError', () => {
	it('translates the known foreign-key delete error', () => {
		expect(translateLessonTypeDeleteError('Cannot delete lesson type because agreements exist')).toBe(
			'Kan lestype niet verwijderen: er zijn bestaande lesovereenkomsten die dit lestype gebruiken',
		);
	});

	it('returns the original message for other errors', () => {
		expect(translateLessonTypeDeleteError('Permission denied')).toBe('Permission denied');
	});
});
