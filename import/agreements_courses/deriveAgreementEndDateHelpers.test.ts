import { describe, expect, it } from 'bun:test';
import { deriveEndDateFromLessonCount, eventsLessonCountMismatchWarning } from './deriveAgreementEndDateHelpers';

describe('deriveEndDateFromLessonCount', () => {
	it('returns the first occurrence when numberOfLessons is 1', () => {
		expect(deriveEndDateFromLessonCount('2026-01-13', 'weekly', 1)).toBe('2026-01-13');
	});

	it('adds weekly intervals for a six-lesson package', () => {
		expect(deriveEndDateFromLessonCount('2026-01-13', 'weekly', 6)).toBe('2026-02-17');
	});

	it('adds biweekly intervals', () => {
		expect(deriveEndDateFromLessonCount('2026-01-13', 'biweekly', 3)).toBe('2026-02-10');
	});

	it('adds monthly calendar intervals', () => {
		expect(deriveEndDateFromLessonCount('2026-01-13', 'monthly', 3)).toBe('2026-03-13');
	});

	it('returns null for non-positive or non-integer lesson counts', () => {
		expect(deriveEndDateFromLessonCount('2026-01-13', 'weekly', 0)).toBeNull();
		expect(deriveEndDateFromLessonCount('2026-01-13', 'weekly', 1.5)).toBeNull();
		expect(deriveEndDateFromLessonCount('2026-01-13', 'weekly', -1)).toBeNull();
	});
});

describe('eventsLessonCountMismatchWarning', () => {
	it('returns null when counts match', () => {
		expect(eventsLessonCountMismatchWarning([1, 2, 3], 3)).toBeNull();
	});

	it('warns when event count differs from numberoflessons', () => {
		expect(eventsLessonCountMismatchWarning([1, 2, 3, 4, 5, 6, 7, 8], 6)).toBe(
			'events count 8 does not match numberoflessons 6',
		);
	});

	it('returns null when events is missing or lesson count is unusable', () => {
		expect(eventsLessonCountMismatchWarning(undefined, 6)).toBeNull();
		expect(eventsLessonCountMismatchWarning([1, 2], null)).toBeNull();
		expect(eventsLessonCountMismatchWarning([1, 2], 0)).toBeNull();
	});
});
