import { describe, expect, it } from 'bun:test';
import { extractMongoOid, parseMongoExportText, unwrapMongoExtendedJson } from './parseMongoExportHelpers';

describe('unwrapMongoExtendedJson', () => {
	it('unwraps $oid', () => {
		expect(unwrapMongoExtendedJson({ $oid: '65deed9a4ab30f9a3714f069' })).toBe('65deed9a4ab30f9a3714f069');
	});

	it('unwraps nested $oid fields', () => {
		expect(
			unwrapMongoExtendedJson({
				_id: { $oid: 'abc' },
				assets: { $oid: 'def' },
			}),
		).toEqual({ _id: 'abc', assets: 'def' });
	});
});

describe('extractMongoOid', () => {
	it('reads oid from extended JSON or plain string', () => {
		expect(extractMongoOid({ $oid: 'oid-1' })).toBe('oid-1');
		expect(extractMongoOid('oid-2')).toBe('oid-2');
		expect(extractMongoOid(null)).toBeNull();
	});
});

describe('parseMongoExportText', () => {
	it('parses JSONL lines', () => {
		const text = ['{"_id":{"$oid":"a"},"name":"Femke"}', '{"_id":{"$oid":"b"},"name":"Anna"}'].join('\n');
		expect(parseMongoExportText(text, 'teachers.jsonl')).toEqual([
			{ _id: 'a', name: 'Femke' },
			{ _id: 'b', name: 'Anna' },
		]);
	});

	it('parses a JSON array', () => {
		const text = JSON.stringify([{ _id: { $oid: 'a' }, name: 'Femke' }]);
		expect(parseMongoExportText(text, 'teachers.json')).toEqual([{ _id: 'a', name: 'Femke' }]);
	});
});
