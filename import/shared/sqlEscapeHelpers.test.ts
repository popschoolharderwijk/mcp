import { describe, expect, it } from 'bun:test';
import { sqlBoolean, sqlString, sqlUuid } from './sqlEscapeHelpers';

describe('sqlEscapeHelpers', () => {
	it('escapes strings and null', () => {
		expect(sqlString(null)).toBe('NULL');
		expect(sqlString("O'dimus")).toBe("'O''dimus'");
	});

	it('formats uuid and boolean literals', () => {
		expect(sqlUuid('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe("'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid");
		expect(sqlBoolean(true)).toBe('TRUE');
		expect(sqlBoolean(false)).toBe('FALSE');
	});
});
