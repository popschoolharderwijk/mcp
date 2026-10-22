import { describe, expect, it } from 'bun:test';
import {
	buildInvoicePdfSuccessPayload,
	hasInvoicePdfStoragePath,
	readInvoicePdfEnv,
	resolveInvoiceNotAvailableError,
	resolveMissingInvoiceIdError,
	resolveSignedUrlCreationError,
} from '../../../supabase/functions/get-invoice-pdf/validationHelpers';

describe('resolveMissingInvoiceIdError', () => {
	it('returns Dutch missing invoice id message', () => {
		expect(resolveMissingInvoiceIdError()).toBe('invoice_id vereist');
	});
});

describe('resolveInvoiceNotAvailableError', () => {
	it('returns Dutch not available message', () => {
		expect(resolveInvoiceNotAvailableError()).toBe('Factuur niet beschikbaar');
	});
});

describe('resolveSignedUrlCreationError', () => {
	it('returns Dutch signed url error message', () => {
		expect(resolveSignedUrlCreationError()).toBe('Kon URL niet maken');
	});
});

describe('hasInvoicePdfStoragePath', () => {
	it('returns true when pdf storage path exists', () => {
		expect(hasInvoicePdfStoragePath({ pdf_storage_path: 'invoices/inv-1.pdf' })).toBe(true);
	});

	it('returns false when invoice is missing', () => {
		expect(hasInvoicePdfStoragePath(null)).toBe(false);
	});

	it('returns false when pdf storage path is null', () => {
		expect(hasInvoicePdfStoragePath({ pdf_storage_path: null })).toBe(false);
	});
});

describe('readInvoicePdfEnv', () => {
	it('reads invoice pdf env keys', () => {
		expect(
			readInvoicePdfEnv((key) => {
				const values: Record<string, string> = {
					SUPABASE_URL: 'https://supabase.example',
					SUPABASE_ANON_KEY: 'anon',
					SUPABASE_SERVICE_ROLE_KEY: 'service',
				};
				return values[key];
			}),
		).toEqual({
			supabaseUrl: 'https://supabase.example',
			anonKey: 'anon',
			serviceKey: 'service',
		});
	});
});

describe('buildInvoicePdfSuccessPayload', () => {
	it('builds success payload', () => {
		expect(buildInvoicePdfSuccessPayload('https://signed.example/pdf', 'INV-001')).toEqual({
			signed_url: 'https://signed.example/pdf',
			invoice_number: 'INV-001',
		});
	});
});
