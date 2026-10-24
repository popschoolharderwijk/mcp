import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs } from '../../db';
import { unwrap } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { ACCOUNTING_SETTINGS } from '../seed-data-constants';
import { type TestUser, TestUsers } from '../test-users';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

/**
 * accounting_settings SELECT: privileged roles (staff/admin/site_admin) only.
 */

const SELECT_COLS =
	'id, journal_code_memorial, journal_code_bank, account_debtors, account_revenue_youth, account_revenue_adult, account_vat_21, account_bank_stripe, vat_code_21, vat_code_exempt, currency, description_template';

async function expectSeesSingleton(user: TestUser) {
	const db = await createClientAs(user);
	const data = unwrap(await db.from('accounting_settings').select(SELECT_COLS));
	expect(data).toHaveLength(1);
	const row = data[0];
	expect(row.id).toBe(true);
	expect(row.journal_code_memorial).toBe(ACCOUNTING_SETTINGS.JOURNAL_CODE_MEMORIAL);
	expect(row.journal_code_bank).toBe(ACCOUNTING_SETTINGS.JOURNAL_CODE_BANK);
	expect(row.account_debtors).toBe(ACCOUNTING_SETTINGS.ACCOUNT_DEBTORS);
	expect(row.account_revenue_youth).toBe(ACCOUNTING_SETTINGS.ACCOUNT_REVENUE_YOUTH);
	expect(row.account_revenue_adult).toBe(ACCOUNTING_SETTINGS.ACCOUNT_REVENUE_ADULT);
	expect(row.account_vat_21).toBe(ACCOUNTING_SETTINGS.ACCOUNT_VAT_21);
	expect(row.account_bank_stripe).toBe(ACCOUNTING_SETTINGS.ACCOUNT_BANK_STRIPE);
	expect(row.vat_code_21).toBe(ACCOUNTING_SETTINGS.VAT_CODE_21);
	expect(row.vat_code_exempt).toBe(ACCOUNTING_SETTINGS.VAT_CODE_EXEMPT);
	expect(row.currency).toBe(ACCOUNTING_SETTINGS.CURRENCY);
	expect(row.description_template).toBe(ACCOUNTING_SETTINGS.DESCRIPTION_TEMPLATE);
}

async function expectSeesNothing(user: TestUser) {
	const db = await createClientAs(user);
	const data = unwrap(await db.from('accounting_settings').select('id'));
	expect(data).toHaveLength(0);
}

describe('RLS: accounting_settings SELECT - privileged', () => {
	it('site_admin sees accounting settings', async () => {
		await expectSeesSingleton(TestUsers.SITE_ADMIN);
	});

	it('admin sees accounting settings', async () => {
		await expectSeesSingleton(TestUsers.ADMIN_ONE);
	});

	it('staff sees accounting settings', async () => {
		await expectSeesSingleton(TestUsers.STAFF_ONE);
	});
});

describe('RLS: accounting_settings SELECT - blocked', () => {
	it('teacher cannot see accounting settings', async () => {
		await expectSeesNothing(TestUsers.TEACHER_ALICE);
	});

	it('student cannot see accounting settings', async () => {
		await expectSeesNothing(TestUsers.STUDENT_001);
	});

	it('user without role cannot see accounting settings', async () => {
		await expectSeesNothing(TestUsers.USER_001);
	});
});
