import { describe, expect, it } from 'bun:test';
import {
	formatAccountingInvoiceDate,
	getAccountingAgeBadge,
	getAccountingStatusBadgeVariant,
} from '../../../src/lib/accounting/accountingReportFormatters';

describe('getAccountingAgeBadge', () => {
	it('returns configured badge for youth', () => {
		expect(getAccountingAgeBadge('youth', 21)).toEqual({
			label: 'Jongeren (vrijgesteld)',
			variant: 'secondary',
		});
	});

	it('returns configured badge for adult using the standard rate', () => {
		expect(getAccountingAgeBadge('adult', 9)).toEqual({
			label: 'Volwassenen (BTW 9%)',
			variant: 'outline',
		});
	});

	it('falls back to the raw category for unknown values', () => {
		expect(getAccountingAgeBadge('custom', 21)).toEqual({
			label: 'custom',
			variant: 'default',
		});
	});
});

describe('formatAccountingInvoiceDate', () => {
	it('returns the date portion of an ISO timestamp', () => {
		expect(formatAccountingInvoiceDate('2026-07-15T00:00:00Z')).toBe('2026-07-15');
	});
});

describe('getAccountingStatusBadgeVariant', () => {
	it('uses secondary variant for paid invoices', () => {
		expect(getAccountingStatusBadgeVariant('paid')).toBe('secondary');
	});

	it('uses outline variant for other statuses', () => {
		expect(getAccountingStatusBadgeVariant('open')).toBe('outline');
	});
});
