import { describe, expect, it } from 'bun:test';
import {
	errorsToCsv,
	fetchLegacyImportTemplate,
	resolveLegacyImportToast,
	resolveLegacyValidationToast,
	toErrorMessage,
} from '../../../src/lib/settings/legacyImportManagerHelpers';

describe('errorsToCsv', () => {
	it('serializes row errors to csv', () => {
		expect(errorsToCsv([{ tab: 'students', row: 2, field: 'email', message: 'Invalid email' }])).toBe(
			'tab,row,field,message\n"students","2","email","Invalid email"',
		);
	});
});

describe('fetchLegacyImportTemplate', () => {
	it('returns the blob when invoke succeeds with a Blob', async () => {
		const blob = new Blob(['xlsx']);
		const result = await fetchLegacyImportTemplate({
			functions: {
				invoke: async () => ({ data: blob, error: null }),
			},
		} as never);
		expect(result).toBe(blob);
	});

	it('throws when invoke returns an error', async () => {
		await expect(
			fetchLegacyImportTemplate({
				functions: {
					invoke: async () => ({ data: null, error: new Error('boom') }),
				},
			} as never),
		).rejects.toThrow('boom');
	});

	it('throws when invoke returns a non-Blob payload', async () => {
		await expect(
			fetchLegacyImportTemplate({
				functions: {
					invoke: async () => ({ data: 'not-a-blob', error: null }),
				},
			} as never),
		).rejects.toThrow('Onverwacht template-antwoord van import-legacy-data');
	});
});

describe('resolveLegacyValidationToast', () => {
	it('returns success when validation passed', () => {
		expect(
			resolveLegacyValidationToast({
				ok: true,
				errors: [],
				counts: {
					lesson_types: 1,
					lesson_type_options: 0,
					teachers: 0,
					students: 0,
					lesson_agreements: 0,
				},
			}),
		).toEqual({ kind: 'success', message: 'Validatie geslaagd — klaar om te importeren' });
	});

	it('returns warning with error count', () => {
		expect(
			resolveLegacyValidationToast({
				ok: false,
				errors: [{ tab: 'students', row: 1, message: 'Missing email' }],
				counts: {
					lesson_types: 0,
					lesson_type_options: 0,
					teachers: 0,
					students: 1,
					lesson_agreements: 0,
				},
			}),
		).toEqual({ kind: 'warning', message: 'Validatie meldt 1 fout(en)' });
	});
});

describe('resolveLegacyImportToast', () => {
	it('returns success when import passed', () => {
		expect(
			resolveLegacyImportToast({
				ok: true,
				summaries: [],
				errors: [],
				counts: {
					lesson_types: 0,
					lesson_type_options: 0,
					teachers: 0,
					students: 0,
					lesson_agreements: 0,
				},
			}),
		).toEqual({ kind: 'success', message: 'Import voltooid' });
	});
});

describe('toErrorMessage', () => {
	it('returns message for Error instances', () => {
		expect(toErrorMessage(new Error('failed'))).toBe('failed');
	});

	it('returns fallback for unknown values', () => {
		expect(toErrorMessage('x')).toBe('Onbekend');
	});
});
