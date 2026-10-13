import { describe, expect, it } from 'bun:test';
import { sqlBoolean, sqlDate, sqlInteger, sqlNumber, sqlString, sqlUuid } from './sqlEscapeHelpers';

describe('sqlEscapeHelpers', () => {
	it('escapes strings and null', () => {
		expect(sqlString(null)).toBe('NULL');
		expect(sqlString("O'dimus")).toBe("'O''dimus'");
	});

	it('formats uuid, boolean, date, and number literals', () => {
		expect(sqlUuid('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe("'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid");
		expect(sqlBoolean(true)).toBe('TRUE');
		expect(sqlBoolean(false)).toBe('FALSE');
		expect(sqlDate(null)).toBe('NULL');
		expect(sqlDate('2023-12-06')).toBe("'2023-12-06'::date");
		expect(sqlNumber(73.38)).toBe('73.38');
		expect(sqlNumber(null)).toBe('NULL');
		expect(sqlInteger(1950)).toBe('1950');
		expect(sqlInteger(null)).toBe('NULL');
	});
});
