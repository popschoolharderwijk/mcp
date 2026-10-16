import { describe, expect, it } from 'bun:test';
import {
	buildInvoiceInsertFailureResult,
	buildInvoiceInsertRow,
	buildInvoiceLineInsertRows,
	buildInvoiceNumberFailureResult,
	buildInvoiceStoragePath,
	buildInvoiceUploadFailureResult,
	buildMissingProfileInvoiceResult,
	buildSkippedStudentInvoiceResult,
	buildSuccessfulStudentInvoiceResult,
	isPreparedStudentInvoiceData,
	prepareStudentInvoiceData,
	resolveInsertedInvoiceRecord,
	resolvePreparedStudentInvoiceResult,
	resolveStudentMandateRef,
	shouldDeliverStudentInvoiceEmail,
} from '../../../supabase/functions/generate-invoice/processStudentInvoicePure';
import type {
	BatchItem,
	InvoiceLine,
	ProfileRow,
	StudentRow,
} from '../../../supabase/functions/generate-invoice/types';

const STUDENT_ID = '11111111-1111-1111-1111-111111111111';
const INVOICE_ID = '22222222-2222-2222-2222-222222222222';
const BATCH_ID = '33333333-3333-3333-3333-333333333333';
const MANDATE_ID = '44444444-4444-4444-4444-444444444444';

const invoiceLine: InvoiceLine = {
	batch_item_id: 'item-1',
	description: 'Les september',
	lesson_date: '2026-09-01',
	quantity: 1,
	unit_price_cents: 1210,
	btw_rate: 21,
	amount_excl_btw_cents: 1000,
	btw_amount_cents: 210,
	amount_total_cents: 1210,
};

describe('buildInvoiceStoragePath', () => {
	it('builds the invoice storage path', () => {
		expect(buildInvoiceStoragePath(STUDENT_ID, INVOICE_ID)).toBe(`${STUDENT_ID}/${INVOICE_ID}.pdf`);
	});
});

describe('buildSkippedStudentInvoiceResult', () => {
	it('builds a skipped invoice result', () => {
		expect(buildSkippedStudentInvoiceResult(STUDENT_ID, { id: INVOICE_ID, invoice_number: 'INV-001' })).toEqual({
			student_user_id: STUDENT_ID,
			invoice_id: INVOICE_ID,
			invoice_number: 'INV-001',
			skipped: true,
		});
	});
});

describe('buildMissingProfileInvoiceResult', () => {
	it('builds the missing profile error result', () => {
		expect(buildMissingProfileInvoiceResult(STUDENT_ID)).toEqual({
			student_user_id: STUDENT_ID,
			error: 'Geen profiel',
		});
	});
});

describe('buildInvoiceInsertRow', () => {
	it('builds the invoice insert payload', () => {
		expect(
			buildInvoiceInsertRow({
				invoiceNumber: 'INV-001',
				studentUserId: STUDENT_ID,
				batchId: BATCH_ID,
				issueDate: '2026-07-01',
				dueDate: '2026-07-15',
				collectionDate: '2026-09-01',
				totals: { excl: 1000, btw21: 210, btw0: 0, total: 1210 },
				ageCategory: '21_plus',
			}),
		).toEqual({
			invoice_number: 'INV-001',
			student_user_id: STUDENT_ID,
			batch_id: BATCH_ID,
			issue_date: '2026-07-01',
			due_date: '2026-07-15',
			period_start: '2026-09-01',
			period_end: '2026-09-01',
			amount_excl_btw_cents: 1000,
			btw_amount_cents: 210,
			amount_total_cents: 1210,
			age_category: '21_plus',
			status: 'issued',
		});
	});
});

describe('buildInvoiceLineInsertRows', () => {
	it('adds invoice id and sort order to each line', () => {
		expect(buildInvoiceLineInsertRows([invoiceLine], INVOICE_ID)).toEqual([
			{ ...invoiceLine, invoice_id: INVOICE_ID, sort_order: 0 },
		]);
	});
});

describe('resolveStudentMandateRef', () => {
	it('returns the mandate reference for the first student item', () => {
		const studentItems: BatchItem[] = [
			{
				id: 'item-1',
				student_user_id: STUDENT_ID,
				amount_cents: 1210,
				remittance_info: 'Les september',
				lesson_agreement_id: 'agr-1',
				mandate_id: MANDATE_ID,
			},
		];
		const mandateMap = new Map([[MANDATE_ID, 'MND-001']]);
		expect(resolveStudentMandateRef(studentItems, mandateMap)).toBe('MND-001');
	});

	it('returns null when no mandate id is present', () => {
		expect(resolveStudentMandateRef([], new Map())).toBeNull();
	});
});

describe('buildSuccessfulStudentInvoiceResult', () => {
	it('builds the successful invoice result', () => {
		expect(buildSuccessfulStudentInvoiceResult(STUDENT_ID, INVOICE_ID, 'INV-001')).toEqual({
			student_user_id: STUDENT_ID,
			invoice_id: INVOICE_ID,
			invoice_number: 'INV-001',
		});
	});
});

const profile: ProfileRow = {
	user_id: STUDENT_ID,
	first_name: 'Anna',
	last_name: 'Bakker',
	email: 'anna@example.com',
};

const studentRow: StudentRow = {
	user_id: STUDENT_ID,
	date_of_birth: '2010-05-01',
	parent_email: 'ouder@example.com',
	parent_name: 'Ouder Bakker',
	debtor_info_same_as_student: false,
	debtor_name: 'Debiteur BV',
	debtor_address: 'Straat 1',
	debtor_postal_code: '1234 AB',
	debtor_city: 'Utrecht',
};

const batchItem: BatchItem = {
	id: 'item-1',
	student_user_id: STUDENT_ID,
	amount_cents: 1210,
	remittance_info: 'Les september',
	lesson_agreement_id: 'agr-1',
	mandate_id: MANDATE_ID,
};

describe('buildInvoiceNumberFailureResult', () => {
	it('builds the invoice number failure result with a fallback message', () => {
		expect(buildInvoiceNumberFailureResult(STUDENT_ID, undefined)).toEqual({
			student_user_id: STUDENT_ID,
			error: 'next_invoice_number faalde',
		});
	});
});

describe('buildInvoiceInsertFailureResult', () => {
	it('builds the invoice insert failure result with a fallback message', () => {
		expect(buildInvoiceInsertFailureResult(STUDENT_ID, undefined)).toEqual({
			student_user_id: STUDENT_ID,
			error: 'Invoice insert faalde',
		});
	});
});

describe('buildInvoiceUploadFailureResult', () => {
	it('builds the upload failure result', () => {
		expect(buildInvoiceUploadFailureResult(STUDENT_ID, INVOICE_ID, 'storage failed')).toEqual({
			student_user_id: STUDENT_ID,
			invoice_id: INVOICE_ID,
			error: 'Upload: storage failed',
		});
	});
});

describe('shouldDeliverStudentInvoiceEmail', () => {
	it('returns true when send email is enabled', () => {
		expect(shouldDeliverStudentInvoiceEmail(true)).toBe(true);
	});

	it('returns false when send email is disabled', () => {
		expect(shouldDeliverStudentInvoiceEmail(false)).toBe(false);
	});
});

describe('resolveInsertedInvoiceRecord', () => {
	it('returns failure when invoice insert data is missing', () => {
		expect(resolveInsertedInvoiceRecord(null, 'insert failed', STUDENT_ID)).toEqual({
			ok: false,
			result: { student_user_id: STUDENT_ID, error: 'insert failed' },
		});
	});

	it('returns invoice id when insert succeeded', () => {
		expect(resolveInsertedInvoiceRecord({ id: INVOICE_ID }, undefined, STUDENT_ID)).toEqual({
			ok: true,
			invoiceId: INVOICE_ID,
		});
	});
});

describe('prepareStudentInvoiceData', () => {
	it('returns missing profile when no profile exists', () => {
		expect(
			prepareStudentInvoiceData({
				studentUserId: STUDENT_ID,
				profile: undefined,
				studentRow: undefined,
				items: [batchItem],
				collectionDate: '2026-09-01',
			}),
		).toEqual({
			ok: false,
			result: { student_user_id: STUDENT_ID, error: 'Geen profiel' },
		});
	});

	it('prepares student invoice lines and totals', () => {
		const prepared = prepareStudentInvoiceData({
			studentUserId: STUDENT_ID,
			profile,
			studentRow,
			items: [batchItem],
			collectionDate: '2010-05-01',
		});
		expect(prepared).toMatchObject({
			ok: true,
			student: {
				user_id: STUDENT_ID,
				email: 'anna@example.com',
			},
			studentItems: [batchItem],
			ageCategory: 'under_21',
		});
		expect(prepared.ok).toBe(true);
		const success = prepared as Extract<typeof prepared, { ok: true }>;
		expect(success.lines).toHaveLength(1);
		expect(success.totals.total).toBe(1210);
	});

	it('stores unknown when the student has no date of birth', () => {
		const prepared = prepareStudentInvoiceData({
			studentUserId: STUDENT_ID,
			profile,
			studentRow: { ...studentRow, date_of_birth: null },
			items: [batchItem],
			collectionDate: '2026-09-01',
		});
		expect(prepared).toMatchObject({ ok: true, ageCategory: 'unknown' });
	});
});

describe('resolvePreparedStudentInvoiceResult', () => {
	it('returns skipped result when invoice already exists', () => {
		expect(
			resolvePreparedStudentInvoiceResult(
				{ id: INVOICE_ID, invoice_number: 'INV-001' },
				prepareStudentInvoiceData({
					studentUserId: STUDENT_ID,
					profile,
					studentRow,
					items: [batchItem],
					collectionDate: '2026-09-01',
				}),
				STUDENT_ID,
			),
		).toEqual({
			student_user_id: STUDENT_ID,
			invoice_id: INVOICE_ID,
			invoice_number: 'INV-001',
			skipped: true,
		});
	});

	it('returns prepared data when invoice does not exist', () => {
		const prepared = prepareStudentInvoiceData({
			studentUserId: STUDENT_ID,
			profile,
			studentRow,
			items: [batchItem],
			collectionDate: '2026-09-01',
		});
		const resolved = resolvePreparedStudentInvoiceResult(null, prepared, STUDENT_ID);
		expect(isPreparedStudentInvoiceData(resolved)).toBe(true);
		expect(resolved).toMatchObject({ ok: true, student: { user_id: STUDENT_ID } });
	});
});
