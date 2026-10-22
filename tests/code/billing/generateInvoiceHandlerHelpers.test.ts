import { describe, expect, it } from 'bun:test';
import {
	buildGenerateInvoiceSuccessPayload,
	readGenerateInvoiceEnv,
	resolveGenerateInvoiceIssueDate,
	resolveGenerateInvoiceMissingBatchError,
	resolveGenerateInvoiceSendEmail,
} from '../../../supabase/functions/generate-invoice/generateInvoiceHandlerHelpers';

describe('resolveGenerateInvoiceMissingBatchError', () => {
	it('returns the missing batch error payload', () => {
		expect(resolveGenerateInvoiceMissingBatchError()).toEqual({
			status: 400,
			error: 'batch_id vereist',
		});
	});
});

describe('resolveGenerateInvoiceSendEmail', () => {
	it('defaults send email to true', () => {
		expect(resolveGenerateInvoiceSendEmail(undefined)).toBe(true);
	});

	it('returns false only when send email is explicitly false', () => {
		expect(resolveGenerateInvoiceSendEmail(false)).toBe(false);
		expect(resolveGenerateInvoiceSendEmail(true)).toBe(true);
	});
});

describe('resolveGenerateInvoiceIssueDate', () => {
	it('returns the issue date in yyyy-mm-dd format', () => {
		expect(resolveGenerateInvoiceIssueDate(new Date('2026-07-17T15:30:00.000Z'))).toBe('2026-07-17');
	});
});

describe('readGenerateInvoiceEnv', () => {
	it('reads supabase env keys with empty string fallbacks', () => {
		expect(
			readGenerateInvoiceEnv((key) => {
				const values: Record<string, string> = {
					SUPABASE_URL: 'https://example.supabase.co',
					SUPABASE_ANON_KEY: 'anon',
					SUPABASE_SERVICE_ROLE_KEY: 'service',
				};
				return values[key];
			}),
		).toEqual({
			supabaseUrl: 'https://example.supabase.co',
			anonKey: 'anon',
			serviceKey: 'service',
		});
	});
});

describe('buildGenerateInvoiceSuccessPayload', () => {
	it('builds the success payload for invoice generation', () => {
		expect(buildGenerateInvoiceSuccessPayload('batch-1', [{ student_user_id: 'stu-1' }])).toEqual({
			ok: true,
			batch_id: 'batch-1',
			results: [{ student_user_id: 'stu-1' }],
		});
	});
});
