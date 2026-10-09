import { describe, expect, it } from 'bun:test';
import { sqlBoolean, sqlDate, sqlString, sqlUuid } from './sqlEscapeHelpers';

describe('sqlEscapeHelpers', () => {
	it('escapes strings and null', () => {
		expect(sqlString(null)).toBe('NULL');
		expect(sqlString("O'dimus")).toBe("'O''dimus'");
	});

	it('formats uuid, boolean, and date literals', () => {
		expect(sqlUuid('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe("'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid");
		expect(sqlBoolean(true)).toBe('TRUE');
		expect(sqlBoolean(false)).toBe('FALSE');
		expect(sqlDate(null)).toBe('NULL');
		expect(sqlDate('2023-12-06')).toBe("'2023-12-06'::date");
	});
});
