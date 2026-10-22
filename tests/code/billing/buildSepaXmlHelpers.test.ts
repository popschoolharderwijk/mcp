import { describe, expect, it } from 'bun:test';
import {
	buildPaymentInfoBlock,
	buildTransactionBlock,
	groupItemsBySequenceType,
} from '../../../supabase/functions/generate-sepa-xml/buildSepaXmlHelpers';
import type { ItemRow } from '../../../supabase/functions/generate-sepa-xml/types';

const baseItem: ItemRow = {
	id: 'item-1',
	mandate_id: 'mandate-1',
	amount_cents: 1950,
	currency: 'EUR',
	end_to_end_id: 'E2E-1',
	remittance_info: 'Les september',
	sequence_type: 'RCUR',
	sepa_mandates: {
		mandate_reference: 'MNDT-1',
		iban: 'NL91 ABNA 0417 1643 00',
		bic: 'ABNANL2A',
		account_holder: 'Jan Leerling',
		signed_at: '2026-01-01',
	},
};

describe('groupItemsBySequenceType', () => {
	it('groups items by sequence type', () => {
		const groups = groupItemsBySequenceType([baseItem, { ...baseItem, id: 'item-2', sequence_type: 'FRST' }]);
		expect(groups.get('RCUR')).toHaveLength(1);
		expect(groups.get('FRST')).toHaveLength(1);
	});
});

describe('buildTransactionBlock', () => {
	it('includes mandate and amount details', () => {
		const block = buildTransactionBlock(baseItem, '2026-09-15');
		expect(block).toContain('E2E-1');
		expect(block).toContain('19.50');
		expect(block).toContain('Jan Leerling');
		expect(block).toContain('NL91ABNA0417164300');
	});

	it('returns empty string when mandate is missing', () => {
		expect(buildTransactionBlock({ ...baseItem, sepa_mandates: null }, '2026-09-15')).toBe('');
	});
});

describe('buildPaymentInfoBlock', () => {
	it('includes payment info metadata', () => {
		const block = buildPaymentInfoBlock('RCUR', 1, 1950, 'MSG-1-PI1', '<tx />', {
			creditorName: 'MCP',
			creditorIban: 'NL00BANK0123456789',
			creditorBic: 'BANKNL2A',
			creditorId: 'CRED-1',
			collectionDate: '2026-09-15',
		});
		expect(block).toContain('RCUR');
		expect(block).toContain('19.50');
		expect(block).toContain('2026-09-15');
	});
});
