import { describe, expect, it } from 'bun:test';
import { IMPORT_CONVERTER_NAMES } from './converters';

describe('IMPORT_CONVERTERS', () => {
	it('runs bun import in dependency order', () => {
		expect(IMPORT_CONVERTER_NAMES).toEqual([
			'courses',
			'profiles',
			'students',
			'teachers',
			'teacher_lesson_types',
			'agreements_courses',
		]);
	});
});
