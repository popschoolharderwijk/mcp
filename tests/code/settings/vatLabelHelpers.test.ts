import { describe, expect, it } from 'bun:test';
import {
	formatAdultVatBadgeLabel,
	formatVatCodeFieldLabel,
	formatVatPayableAccountLabel,
	formatVatPercentLabel,
} from '../../../src/lib/settings/vatLabelHelpers';

describe('vatLabelHelpers', () => {
	it('formats the standard VAT percent label', () => {
		expect(formatVatPercentLabel(21)).toBe('BTW 21%');
		expect(formatVatPercentLabel(9)).toBe('BTW 9%');
	});

	it('formats ledger and code field labels with the rate', () => {
		expect(formatVatPayableAccountLabel(21)).toBe('BTW af te dragen 21%');
		expect(formatVatCodeFieldLabel(9)).toBe('BTW-code 9%');
	});

	it('formats the adult age badge with the rate', () => {
		expect(formatAdultVatBadgeLabel(21)).toBe('Volwassenen (BTW 21%)');
	});
});
