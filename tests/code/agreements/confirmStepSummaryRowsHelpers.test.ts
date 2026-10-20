import { describe, expect, it } from 'bun:test';
import { mapConfirmSelectedLessonTypeValues } from '../../../src/lib/agreements/confirmStepSummaryRowsHelpers';

describe('mapConfirmSelectedLessonTypeValues', () => {
	it('maps lesson type fields for confirm rows', () => {
		expect(
			mapConfirmSelectedLessonTypeValues({
				id: 'lt-1',
				name: 'Piano',
				icon: null,
				color: null,
				frequency: 'weekly',
				duration_minutes: 45,
				price_per_lesson: null,
				lesson_type_option_id: 'opt-1',
			}),
		).toEqual({
			lessonTypeName: 'Piano',
			frequency: 'weekly',
			durationMinutes: 45,
		});
	});

	it('returns undefined fields when lesson type is missing', () => {
		expect(mapConfirmSelectedLessonTypeValues(undefined)).toEqual({
			lessonTypeName: undefined,
			frequency: undefined,
			durationMinutes: undefined,
		});
	});
});
