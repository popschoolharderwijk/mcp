import { describe, expect, it } from 'bun:test';
import { invertLessonTypeAliases, parseLessonTypeAliases } from './lessonTypeAliasHelpers';

describe('parseLessonTypeAliases', () => {
	it('rejects a source name listed under two canonical names', () => {
		expect(
			parseLessonTypeAliases({
				Muziekclub: ['15 Muziekclub September 2025'],
				Other: ['15 Muziekclub September 2025'],
			}),
		).toEqual({
			ok: false,
			error: 'settings.json lessonTypeAliases: source name "15 Muziekclub September 2025" listed under both "Muziekclub" and "Other"',
		});
	});
});

describe('invertLessonTypeAliases', () => {
	it('maps each source name to its canonical', () => {
		expect(
			invertLessonTypeAliases({
				Muziekclub: ['15 Muziekclub September 2025', '16 Muziekclub November 2025'],
				'09 Gitaar': ['09 Gitaar'],
			}),
		).toEqual({
			ok: true,
			sourceToCanonical: new Map([
				['15 Muziekclub September 2025', 'Muziekclub'],
				['16 Muziekclub November 2025', 'Muziekclub'],
				['09 Gitaar', '09 Gitaar'],
			]),
		});
	});
});
