import { describe, expect, it } from 'bun:test';
import { PRIMARY_HEX } from '../../../src/lib/color/brand-hex';
import {
	buildInvoiceEmailDeliveryContent,
	buildInvoiceEmailHtml,
	buildInvoiceEmailSubject,
	buildInvoiceLines,
	buildInvoicePaymentNote,
	buildResendInvoiceEmailPayload,
	buildStudentInfo,
	canSendInvoiceEmail,
	computeDueDate,
	computeTotals,
	filterStudentItems,
	getCollectionDate,
	hasAdminRole,
	INVOICE_MAIL_PRIMARY_HEX,
	isServiceRoleToken,
	readInvoiceMailEnv,
	resolveAgeCategory,
	resolveInvoiceEmailRecipient,
	shouldRecordInvoiceEmailSent,
	stripBearerToken,
} from '../../../supabase/functions/generate-invoice/invoicePure';
import type {
	BatchItem,
	DirectDebitBatch,
	InvoiceLine,
	ProfileRow,
	StudentRow,
} from '../../../supabase/functions/generate-invoice/types';

const profile: ProfileRow = {
	user_id: 'student-1',
	first_name: 'Anna',
	last_name: 'Bakker',
	email: 'anna@example.com',
};

const studentRow: StudentRow = {
	user_id: 'student-1',
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
	student_user_id: 'student-1',
	amount_cents: 2420,
	remittance_info: 'Lesgeld september',
	lesson_agreement_id: 'agr-1',
	mandate_id: 'mandate-1',
};

describe('buildStudentInfo', () => {
	it('maps profile and student debtor fields', () => {
		expect(buildStudentInfo('student-1', profile, studentRow)).toEqual({
			user_id: 'student-1',
			first_name: 'Anna',
			last_name: 'Bakker',
			email: 'anna@example.com',
			date_of_birth: '2010-05-01',
			parent_email: 'ouder@example.com',
			parent_name: 'Ouder Bakker',
			debtor_name: 'Debiteur BV',
			debtor_address: 'Straat 1',
			debtor_postal_code: '1234 AB',
			debtor_city: 'Utrecht',
			debtor_info_same_as_student: false,
		});
	});

	it('defaults missing student fields to null and debtor_info_same_as_student to true', () => {
		expect(buildStudentInfo('student-1', profile, undefined)).toEqual({
			user_id: 'student-1',
			first_name: 'Anna',
			last_name: 'Bakker',
			email: 'anna@example.com',
			date_of_birth: null,
			parent_email: null,
			parent_name: null,
			debtor_name: null,
			debtor_address: null,
			debtor_postal_code: null,
			debtor_city: null,
			debtor_info_same_as_student: true,
		});
	});
});

describe('buildInvoiceLines', () => {
	it('applies 21% VAT for adult students', () => {
		const adultStudent = buildStudentInfo('student-2', profile, {
			...studentRow,
			date_of_birth: '1990-01-01',
		});
		const lines = buildInvoiceLines([batchItem], adultStudent, '2026-09-01');
		expect(lines).toHaveLength(1);
		expect(lines[0]).toEqual({
			batch_item_id: 'item-1',
			description: 'Lesgeld september',
			lesson_date: '2026-09-01',
			quantity: 1,
			unit_price_cents: 2420,
			btw_rate: 21,
			amount_excl_btw_cents: 2000,
			btw_amount_cents: 420,
			amount_total_cents: 2420,
		});
	});

	it('applies 0% VAT for under-21 students', () => {
		const minorStudent = buildStudentInfo('student-1', profile, studentRow);
		const lines = buildInvoiceLines([batchItem], minorStudent, '2026-09-01');
		expect(lines[0]).toEqual({
			batch_item_id: 'item-1',
			description: 'Lesgeld september',
			lesson_date: '2026-09-01',
			quantity: 1,
			unit_price_cents: 2420,
			btw_rate: 0,
			amount_excl_btw_cents: 2420,
			btw_amount_cents: 0,
			amount_total_cents: 2420,
		});
	});
});

describe('computeTotals', () => {
	it('sums excl, btw and total amounts across lines', () => {
		const lines: InvoiceLine[] = [
			{
				batch_item_id: 'item-1',
				description: 'Adult',
				lesson_date: '2026-09-01',
				quantity: 1,
				unit_price_cents: 2420,
				btw_rate: 21,
				amount_excl_btw_cents: 2000,
				btw_amount_cents: 420,
				amount_total_cents: 2420,
			},
			{
				batch_item_id: 'item-2',
				description: 'Minor',
				lesson_date: '2026-09-01',
				quantity: 1,
				unit_price_cents: 1950,
				btw_rate: 0,
				amount_excl_btw_cents: 1950,
				btw_amount_cents: 0,
				amount_total_cents: 1950,
			},
		];
		expect(computeTotals(lines)).toEqual({ excl: 3950, btw21: 420, btw0: 1950, total: 4370 });
	});
});

describe('resolveAgeCategory', () => {
	it('returns mixed when both VAT rates are present', () => {
		const lines: InvoiceLine[] = [
			{
				batch_item_id: '1',
				description: '',
				lesson_date: null,
				quantity: 1,
				unit_price_cents: 1,
				btw_rate: 21,
				amount_excl_btw_cents: 1,
				btw_amount_cents: 1,
				amount_total_cents: 1,
			},
			{
				batch_item_id: '2',
				description: '',
				lesson_date: null,
				quantity: 1,
				unit_price_cents: 1,
				btw_rate: 0,
				amount_excl_btw_cents: 1,
				btw_amount_cents: 0,
				amount_total_cents: 1,
			},
		];
		expect(resolveAgeCategory(lines)).toBe('mixed');
	});

	it('returns 21_plus when only 21% lines exist', () => {
		const lines: InvoiceLine[] = [
			{
				batch_item_id: '1',
				description: '',
				lesson_date: null,
				quantity: 1,
				unit_price_cents: 1,
				btw_rate: 21,
				amount_excl_btw_cents: 1,
				btw_amount_cents: 1,
				amount_total_cents: 1,
			},
		];
		expect(resolveAgeCategory(lines)).toBe('21_plus');
	});

	it('returns under_21 when only 0% lines exist', () => {
		const lines: InvoiceLine[] = [
			{
				batch_item_id: '1',
				description: '',
				lesson_date: null,
				quantity: 1,
				unit_price_cents: 1,
				btw_rate: 0,
				amount_excl_btw_cents: 1,
				btw_amount_cents: 0,
				amount_total_cents: 1,
			},
		];
		expect(resolveAgeCategory(lines)).toBe('under_21');
	});

	it('returns unknown for an empty line list', () => {
		expect(resolveAgeCategory([])).toBe('unknown');
	});
});

describe('filterStudentItems', () => {
	it('keeps only batch items for the requested student', () => {
		const items: BatchItem[] = [batchItem, { ...batchItem, id: 'item-2', student_user_id: 'student-2' }];
		expect(filterStudentItems(items, 'student-1')).toHaveLength(1);
		expect(filterStudentItems(items, 'student-1')[0]?.id).toBe('item-1');
	});
});

describe('getCollectionDate', () => {
	it('returns the batch collection date', () => {
		const batch: DirectDebitBatch = { collection_date: '2026-09-15' };
		expect(getCollectionDate(batch)).toBe('2026-09-15');
	});
});

describe('computeDueDate', () => {
	it('returns a date string fourteen days ahead by default', () => {
		const fixedNow = new Date('2026-09-01T12:00:00Z').getTime();
		const originalNow = Date.now;
		Date.now = () => fixedNow;
		expect(computeDueDate(undefined)).toBe('2026-09-15');
		Date.now = originalNow;
	});

	it('uses the provided payment term days', () => {
		const fixedNow = new Date('2026-09-01T12:00:00Z').getTime();
		const originalNow = Date.now;
		Date.now = () => fixedNow;
		expect(computeDueDate(7)).toBe('2026-09-08');
		Date.now = originalNow;
	});
});

describe('resolveInvoiceEmailRecipient', () => {
	it('prefers parent email over student email', () => {
		expect(
			resolveInvoiceEmailRecipient({
				parent_email: 'ouder@example.com',
				email: 'student@example.com',
			}),
		).toBe('ouder@example.com');
	});

	it('falls back to student email when parent email is missing', () => {
		expect(
			resolveInvoiceEmailRecipient({
				parent_email: null,
				email: 'student@example.com',
			}),
		).toBe('student@example.com');
	});
});

describe('buildInvoicePaymentNote', () => {
	it('builds a mandate note when a mandate reference is present', () => {
		expect(buildInvoicePaymentNote('2026-09-15', 'MDT-1', (iso) => iso)).toBe(
			'<p>Dit bedrag wordt automatisch geïncasseerd op of rond 2026-09-15 via SEPA-mandaat MDT-1.</p>',
		);
	});

	it('builds a manual payment note when no mandate reference is present', () => {
		expect(buildInvoicePaymentNote('2026-09-15', null, (iso) => iso)).toBe(
			'<p>Gelieve het bedrag te voldoen vóór 2026-09-15.</p>',
		);
	});
});

describe('buildInvoiceEmailSubject', () => {
	it('builds the invoice email subject line', () => {
		expect(buildInvoiceEmailSubject('INV-001', 'PopSchool')).toBe('Factuur INV-001 – PopSchool');
	});
});

describe('buildInvoiceEmailHtml', () => {
	it('builds the invoice email html body', () => {
		expect(
			buildInvoiceEmailHtml({
				firstName: 'Anna',
				invoiceNumber: 'INV-001',
				totalFormatted: '€ 25,00',
				paymentNote: '<p>Pay soon.</p>',
				companyName: 'PopSchool',
			}),
		).toContain('Beste Anna,');
		expect(
			buildInvoiceEmailHtml({
				firstName: 'Anna',
				invoiceNumber: 'INV-001',
				totalFormatted: '€ 25,00',
				paymentNote: '<p>Pay soon.</p>',
				companyName: 'PopSchool',
			}),
		).toContain('<strong>INV-001</strong>');
	});

	it('uses mail header hex mirrored from PRIMARY_HEX', () => {
		expect(INVOICE_MAIL_PRIMARY_HEX.toLowerCase()).toBe(PRIMARY_HEX);
		const html = buildInvoiceEmailHtml({
			firstName: 'Anna',
			invoiceNumber: 'INV-001',
			totalFormatted: '€ 25,00',
			paymentNote: '',
			companyName: 'PopSchool',
		});
		expect(html).toContain(`background:${INVOICE_MAIL_PRIMARY_HEX}`);
	});
});

describe('canSendInvoiceEmail', () => {
	it('returns true when recipient and resend credentials are present', () => {
		expect(canSendInvoiceEmail('student@example.com', 're_key', 'from@example.com')).toBe(true);
	});

	it('returns false when any required value is missing', () => {
		expect(canSendInvoiceEmail(null, 're_key', 'from@example.com')).toBe(false);
	});
});

describe('buildResendInvoiceEmailPayload', () => {
	it('builds the resend api payload for invoice emails', () => {
		expect(
			buildResendInvoiceEmailPayload({
				fromEmail: 'from@example.com',
				recipient: 'student@example.com',
				subject: 'Factuur INV-001',
				html: '<p>Hello</p>',
				invoiceNumber: 'INV-001',
				pdfBase64: 'cGRm',
			}),
		).toEqual({
			from: 'from@example.com',
			to: ['student@example.com'],
			subject: 'Factuur INV-001',
			html: '<p>Hello</p>',
			attachments: [{ filename: 'INV-001.pdf', content: 'cGRm' }],
		});
	});
});

describe('buildInvoiceEmailDeliveryContent', () => {
	it('builds recipient, subject and html for invoice emails', () => {
		const content = buildInvoiceEmailDeliveryContent({
			student: {
				first_name: 'Anna',
				email: 'student@example.com',
				parent_email: null,
			},
			invoiceNumber: 'INV-001',
			totals: { total: 1210 },
			dueDate: '2026-07-31',
			mandateRef: 'MND-001',
			settings: { company_name: 'PopSchool' },
			formatDate: (value) => `date:${value}`,
			formatCurrency: (cents) => `eur:${cents}`,
		});

		expect(content.recipient).toBe('student@example.com');
		expect(content.companyName).toBe('PopSchool');
		expect(content.subject).toBe('Factuur INV-001 – PopSchool');
		expect(content.html).toContain('Anna');
		expect(content.html).toContain('INV-001');
		expect(content.html).toContain('eur:1210');
	});
});

describe('readInvoiceMailEnv', () => {
	it('reads invoice mail env keys', () => {
		expect(
			readInvoiceMailEnv((key) => {
				const values: Record<string, string> = {
					RESEND_API_KEY_TRANSACTIONAL: 'resend',
					RESEND_FROM_EMAIL: 'mail@example.com',
				};
				return values[key];
			}),
		).toEqual({ resendKey: 'resend', fromEmail: 'mail@example.com' });
	});
});

describe('shouldRecordInvoiceEmailSent', () => {
	it('returns true only for successful responses', () => {
		expect(shouldRecordInvoiceEmailSent(true)).toBe(true);
		expect(shouldRecordInvoiceEmailSent(false)).toBe(false);
	});
});

describe('stripBearerToken', () => {
	it('removes the bearer prefix case-insensitively', () => {
		expect(stripBearerToken('Bearer token-1')).toBe('token-1');
		expect(stripBearerToken('bearer token-2')).toBe('token-2');
	});
});

describe('isServiceRoleToken', () => {
	it('matches service role tokens exactly', () => {
		expect(isServiceRoleToken('service-key', 'service-key')).toBe(true);
		expect(isServiceRoleToken('other-key', 'service-key')).toBe(false);
	});
});

describe('hasAdminRole', () => {
	it('returns true for admin and site_admin roles', () => {
		expect(hasAdminRole([{ role: 'admin' }])).toBe(true);
		expect(hasAdminRole([{ role: 'site_admin' }])).toBe(true);
	});

	it('returns false for non-admin roles', () => {
		expect(hasAdminRole([{ role: 'staff' }])).toBe(false);
		expect(hasAdminRole(null)).toBe(false);
	});
});
