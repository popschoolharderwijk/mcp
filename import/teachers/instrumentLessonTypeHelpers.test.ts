import { describe, expect, it } from 'bun:test';
import { mapInstrumentToLessonTypes } from './instrumentLessonTypeHelpers';

describe('mapInstrumentToLessonTypes', () => {
	it('returns empty lists for missing instrument', () => {
		expect(mapInstrumentToLessonTypes(null)).toEqual({ lessonTypeNames: [], unmatchedTokens: [] });
		expect(mapInstrumentToLessonTypes('')).toEqual({ lessonTypeNames: [], unmatchedTokens: [] });
	});

	it('maps zang and Zang to Zangles', () => {
		expect(mapInstrumentToLessonTypes('zang')).toEqual({
			lessonTypeNames: ['Zangles'],
			unmatchedTokens: [],
		});
		expect(mapInstrumentToLessonTypes('Zang')).toEqual({
			lessonTypeNames: ['Zangles'],
			unmatchedTokens: [],
		});
		expect(mapInstrumentToLessonTypes('zang (inval)')).toEqual({
			lessonTypeNames: ['Zangles'],
			unmatchedTokens: [],
		});
	});

	it('maps gitaar to Gitaarles', () => {
		expect(mapInstrumentToLessonTypes('gitaar')).toEqual({
			lessonTypeNames: ['Gitaarles'],
			unmatchedTokens: [],
		});
		expect(mapInstrumentToLessonTypes('Gitaar')).toEqual({
			lessonTypeNames: ['Gitaarles'],
			unmatchedTokens: [],
		});
	});

	it('maps DJ/Beats variants to DJ / Beats', () => {
		expect(mapInstrumentToLessonTypes('DJ')).toEqual({
			lessonTypeNames: ['DJ / Beats'],
			unmatchedTokens: [],
		});
		expect(mapInstrumentToLessonTypes('DJ/Beats')).toEqual({
			lessonTypeNames: ['DJ / Beats'],
			unmatchedTokens: [],
		});
	});

	it('maps toetsen to Keyboardles and saxofoon to Saxofoonles', () => {
		expect(mapInstrumentToLessonTypes('toetsen').lessonTypeNames).toEqual(['Keyboardles']);
		expect(mapInstrumentToLessonTypes('saxofoon').lessonTypeNames).toEqual(['Saxofoonles']);
		expect(mapInstrumentToLessonTypes('drum').lessonTypeNames).toEqual(['Drumles']);
		expect(mapInstrumentToLessonTypes('bas').lessonTypeNames).toEqual(['Basles']);
	});

	it('returns unmatched tokens that cannot be linked', () => {
		expect(mapInstrumentToLessonTypes('studio / concierge')).toEqual({
			lessonTypeNames: [],
			unmatchedTokens: ['studio', 'concierge'],
		});
		expect(mapInstrumentToLessonTypes('hiphop / U-create')).toEqual({
			lessonTypeNames: [],
			unmatchedTokens: ['hiphop', 'u-create'],
		});
	});

	it('keeps matched parts when a compound field is partially known', () => {
		expect(mapInstrumentToLessonTypes('gitaar / studio')).toEqual({
			lessonTypeNames: ['Gitaarles'],
			unmatchedTokens: ['studio'],
		});
	});
});
