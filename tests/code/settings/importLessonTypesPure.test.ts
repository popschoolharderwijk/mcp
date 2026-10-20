import { describe, expect, it } from 'bun:test';
import {
	buildLegacyLessonTypeImportError,
	buildLegacyLessonTypeOptionImportError,
	buildLegacyLessonTypeOptionPayload,
	buildLegacyLessonTypePayload,
	resolveLessonTypeOptionLessonTypeId,
} from '../../../supabase/functions/import-legacy-data/importLessonTypesPure';

describe('buildLegacyLessonTypePayload', () => {
	it('builds lesson type payload with defaults', () => {
		expect(
			buildLegacyLessonTypePayload({
				name: 'Piano',
				icon: 'piano',
				color: '#000000',
			}),
		).toEqual({
			name: 'Piano',
			icon: 'piano',
			color: '#000000',
			is_group_lesson: false,
			cost_center: null,
			description: null,
			is_active: true,
		});
	});
});

describe('buildLegacyLessonTypeOptionPayload', () => {
	it('builds lesson type option payload', () => {
		expect(
			buildLegacyLessonTypeOptionPayload(
				{
					legacy_id: 'opt-1',
					lesson_type_legacy_id: 'lt-1',
					frequency: 'weekly',
					duration_minutes: 45,
				},
				'lesson-type-uuid',
			),
		).toEqual({
			lesson_type_id: 'lesson-type-uuid',
			frequency: 'weekly',
			duration_minutes: 45,
		});
	});
});

describe('resolveLessonTypeOptionLessonTypeId', () => {
	it('returns mapped lesson type id', () => {
		const typeMap = new Map([['lt-1', 'lesson-type-uuid']]);
		expect(resolveLessonTypeOptionLessonTypeId(typeMap, 'lt-1')).toBe('lesson-type-uuid');
	});

	it('throws when lesson type mapping is missing', () => {
		const typeMap = new Map<string, string>();
		expect(() => resolveLessonTypeOptionLessonTypeId(typeMap, 'lt-1')).toThrow('Geen lesson_type voor lt-1');
	});
});

describe('buildLegacyLessonTypeOptionImportError', () => {
	it('builds row error payload', () => {
		expect(buildLegacyLessonTypeOptionImportError(4, 'failed')).toEqual({
			tab: 'lesson_type_options',
			row: 4,
			message: 'failed',
		});
	});
});

describe('buildLegacyLessonTypeImportError', () => {
	it('builds row error payload', () => {
		expect(buildLegacyLessonTypeImportError('lesson_types', 3, 'failed')).toEqual({
			tab: 'lesson_types',
			row: 3,
			message: 'failed',
		});
	});
});
