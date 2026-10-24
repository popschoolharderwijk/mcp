import { describe, expect, it } from 'bun:test';
import { parseTipBody } from '../../../src/lib/tips/tipBodyHelpers';

describe('parseTipBody', () => {
	it('returns plain text when there are no keys', () => {
		expect(parseTipBody('Geen shortcut hier.')).toEqual([
			{ key: 't0', type: 'text', value: 'Geen shortcut hier.' },
		]);
	});

	it('splits key tokens into kbd parts', () => {
		expect(parseTipBody('Druk op {{/}} of {{f}} om verder te gaan.')).toEqual([
			{ key: 't0', type: 'text', value: 'Druk op ' },
			{ key: 'k1', type: 'key', value: '/' },
			{ key: 't2', type: 'text', value: ' of ' },
			{ key: 'k3', type: 'key', value: 'f' },
			{ key: 't4', type: 'text', value: ' om verder te gaan.' },
		]);
	});

	it('handles body that starts with a key', () => {
		expect(parseTipBody('{{f}} toggles fullscreen')).toEqual([
			{ key: 'k0', type: 'key', value: 'f' },
			{ key: 't1', type: 'text', value: ' toggles fullscreen' },
		]);
	});

	it('splits icon tokens into icon parts', () => {
		expect(parseTipBody('Een geel {{icon:tips}} betekent nieuw.')).toEqual([
			{ key: 't0', type: 'text', value: 'Een geel ' },
			{ key: 'i1', type: 'icon', value: 'tips' },
			{ key: 't2', type: 'text', value: ' betekent nieuw.' },
		]);
	});
});
