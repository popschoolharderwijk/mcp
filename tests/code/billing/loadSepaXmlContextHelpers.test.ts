import { describe, expect, it } from 'bun:test';
import {
	normalizeSepaSettings,
	resolveSepaBatchItemsFailure,
	resolveSepaBatchLoadFailure,
	resolveSepaBatchStatusFailure,
	resolveSepaSettingsIncomplete,
	resolveSepaSettingsLoadFailure,
} from '../../../supabase/functions/generate-sepa-xml/loadSepaXmlContextHelpers';

const settings = {
	sepa_creditor_name: 'PopSchool',
	sepa_creditor_iban: 'NL00BANK0123456789',
	sepa_creditor_bic: 'BANKNL2A',
	sepa_creditor_id: 'CRED-1',
};

describe('resolveSepaSettingsLoadFailure', () => {
	it('returns error when settings are missing', () => {
		expect(resolveSepaSettingsLoadFailure(null, 'db error')).toEqual({
			status: 500,
			error: 'Boekhoud-instellingen ontbreken',
		});
	});

	it('returns null when settings exist', () => {
		expect(resolveSepaSettingsLoadFailure(settings, undefined)).toBeNull();
	});
});

describe('resolveSepaSettingsIncomplete', () => {
	it('returns error when required creditor fields are missing', () => {
		expect(
			resolveSepaSettingsIncomplete({
				...settings,
				sepa_creditor_name: null,
			}),
		).toEqual({
			status: 422,
			error: 'Vul eerst alle SEPA-crediteurgegevens in',
		});
	});

	it('returns null when settings are complete', () => {
		expect(resolveSepaSettingsIncomplete(settings)).toBeNull();
	});
});

describe('normalizeSepaSettings', () => {
	it('normalizes required creditor fields', () => {
		expect(normalizeSepaSettings(settings).sepa_creditor_name).toBe('PopSchool');
	});
});

describe('resolveSepaBatchLoadFailure', () => {
	it('returns not found when batch is missing', () => {
		expect(resolveSepaBatchLoadFailure(null, undefined)).toEqual({
			status: 404,
			error: 'Batch niet gevonden',
		});
	});
});

describe('resolveSepaBatchStatusFailure', () => {
	it('returns conflict for non-approved batches', () => {
		expect(
			resolveSepaBatchStatusFailure({
				id: 'batch-1',
				batch_number: '2026-01',
				status: 'draft',
				collection_date: '2026-09-01',
				message_id: null,
				xml_storage_path: null,
			}),
		).toEqual({
			status: 409,
			error: 'Batch is niet goedgekeurd',
		});
	});

	it('returns null for approved batches', () => {
		expect(
			resolveSepaBatchStatusFailure({
				id: 'batch-1',
				batch_number: '2026-01',
				status: 'approved',
				collection_date: '2026-09-01',
				message_id: null,
				xml_storage_path: null,
			}),
		).toBeNull();
	});
});

describe('resolveSepaBatchItemsFailure', () => {
	it('returns error when items list is empty', () => {
		expect(resolveSepaBatchItemsFailure([], undefined)).toEqual({
			status: 422,
			error: 'Geen regels in batch',
		});
	});

	it('returns null when items exist', () => {
		expect(
			resolveSepaBatchItemsFailure(
				[
					{
						id: 'item-1',
						mandate_id: 'mandate-1',
						amount_cents: 1000,
						currency: 'EUR',
						end_to_end_id: 'E2E-1',
						remittance_info: 'Les',
						sequence_type: 'RCUR',
						sepa_mandates: null,
					},
				],
				undefined,
			),
		).toBeNull();
	});
});
