import { describe, expect, it } from 'bun:test';
import { IMPORT_CONVERTER_NAMES } from './converters';

describe('IMPORT_CONVERTERS', () => {
	it('runs bun import all in dependency order', () => {
		expect(IMPORT_CONVERTER_NAMES).toEqual(['courses', 'teachers', 'students', 'agreements_courses']);
	});
});
