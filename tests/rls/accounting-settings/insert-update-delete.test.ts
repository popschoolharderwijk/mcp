import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs } from '../../db';
import { expectInsufficientPrivilege, unwrap, unwrapError, unwrapSingleRow } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
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
 * accounting_settings writes: admin OR site_admin may INSERT / UPDATE / DELETE.
 * staff and non-privileged roles are denied.
 */

const SINGLETON_DEFAULTS = {
	id: true as const,
	journal_code_memorial: ACCOUNTING_SETTINGS.JOURNAL_CODE_MEMORIAL,
	journal_code_bank: ACCOUNTING_SETTINGS.JOURNAL_CODE_BANK,
	account_debtors: ACCOUNTING_SETTINGS.ACCOUNT_DEBTORS,
	account_revenue_youth: ACCOUNTING_SETTINGS.ACCOUNT_REVENUE_YOUTH,
	account_revenue_adult: ACCOUNTING_SETTINGS.ACCOUNT_REVENUE_ADULT,
	account_vat_21: ACCOUNTING_SETTINGS.ACCOUNT_VAT_21,
	account_bank_stripe: ACCOUNTING_SETTINGS.ACCOUNT_BANK_STRIPE,
	vat_code_21: ACCOUNTING_SETTINGS.VAT_CODE_21,
	vat_code_exempt: ACCOUNTING_SETTINGS.VAT_CODE_EXEMPT,
	currency: ACCOUNTING_SETTINGS.CURRENCY,
	description_template: ACCOUNTING_SETTINGS.DESCRIPTION_TEMPLATE,
};

async function expectInsertBlocked(user: TestUser) {
	const db = await createClientAs(user);
	expectInsufficientPrivilege(unwrapError(await db.from('accounting_settings').insert(SINGLETON_DEFAULTS).select()));
}

async function expectUpdateBlocked(user: TestUser) {
	const db = await createClientAs(user);
	const data = unwrap(
		await db.from('accounting_settings').update({ journal_code_memorial: '99' }).eq('id', true).select(),
	);
	expect(data).toHaveLength(0);
}

async function expectDeleteBlocked(user: TestUser) {
	const db = await createClientAs(user);
	const data = unwrap(await db.from('accounting_settings').delete().eq('id', true).select());
	expect(data).toHaveLength(0);
}

async function expectAdminCanUpdateAndRestore(user: TestUser) {
	const actorId = fixtures.requireUserId(user);
	const db = await createClientAs(user);

	const updated = unwrap(
		await db
			.from('accounting_settings')
			.update({ journal_code_memorial: '91' })
			.eq('id', true)
			.select('journal_code_memorial, updated_by'),
	);
	expect(updated).toHaveLength(1);
	expect(updated[0].journal_code_memorial).toBe('91');
	expect(updated[0].updated_by).toBe(actorId);

	const restored = unwrap(
		await db
			.from('accounting_settings')
			.update({ journal_code_memorial: ACCOUNTING_SETTINGS.JOURNAL_CODE_MEMORIAL })
			.eq('id', true)
			.select('journal_code_memorial'),
	);
	expect(restored).toHaveLength(1);
	expect(restored[0].journal_code_memorial).toBe(ACCOUNTING_SETTINGS.JOURNAL_CODE_MEMORIAL);
}

async function expectAdminCanDeleteAndReinsert(user: TestUser) {
	const db = await createClientAs(user);

	const deleted = unwrap(await db.from('accounting_settings').delete().eq('id', true).select('id'));
	expect(deleted).toHaveLength(1);
	expect(deleted[0].id).toBe(true);

	const [inserted] = unwrap(
		await db.from('accounting_settings').insert(SINGLETON_DEFAULTS).select('id, journal_code_memorial, currency'),
	);
	expect(inserted.id).toBe(true);
	expect(inserted.journal_code_memorial).toBe(ACCOUNTING_SETTINGS.JOURNAL_CODE_MEMORIAL);
	expect(inserted.currency).toBe(ACCOUNTING_SETTINGS.CURRENCY);

	const verify = unwrapSingleRow(
		await db.from('accounting_settings').select('journal_code_bank, account_debtors').eq('id', true).single(),
	);
	expect(verify.journal_code_bank).toBe(ACCOUNTING_SETTINGS.JOURNAL_CODE_BANK);
	expect(verify.account_debtors).toBe(ACCOUNTING_SETTINGS.ACCOUNT_DEBTORS);
}

describe('RLS: accounting_settings INSERT - blocked', () => {
	it('staff cannot insert accounting settings', async () => {
		await expectInsertBlocked(TestUsers.STAFF_ONE);
	});

	it('teacher cannot insert accounting settings', async () => {
		await expectInsertBlocked(TestUsers.TEACHER_ALICE);
	});

	it('student cannot insert accounting settings', async () => {
		await expectInsertBlocked(TestUsers.STUDENT_001);
	});

	it('user without role cannot insert accounting settings', async () => {
		await expectInsertBlocked(TestUsers.USER_001);
	});
});

describe('RLS: accounting_settings UPDATE - blocked', () => {
	it('staff cannot update accounting settings', async () => {
		await expectUpdateBlocked(TestUsers.STAFF_ONE);
	});

	it('teacher cannot update accounting settings', async () => {
		await expectUpdateBlocked(TestUsers.TEACHER_ALICE);
	});

	it('student cannot update accounting settings', async () => {
		await expectUpdateBlocked(TestUsers.STUDENT_001);
	});

	it('user without role cannot update accounting settings', async () => {
		await expectUpdateBlocked(TestUsers.USER_001);
	});
});

describe('RLS: accounting_settings DELETE - blocked', () => {
	it('staff cannot delete accounting settings', async () => {
		await expectDeleteBlocked(TestUsers.STAFF_ONE);
	});

	it('teacher cannot delete accounting settings', async () => {
		await expectDeleteBlocked(TestUsers.TEACHER_ALICE);
	});

	it('student cannot delete accounting settings', async () => {
		await expectDeleteBlocked(TestUsers.STUDENT_001);
	});

	it('user without role cannot delete accounting settings', async () => {
		await expectDeleteBlocked(TestUsers.USER_001);
	});
});

describe('RLS: accounting_settings writes - admin and site_admin allowed', () => {
	it('site_admin can update journal_code_memorial and restore it', async () => {
		await expectAdminCanUpdateAndRestore(TestUsers.SITE_ADMIN);
	});

	it('admin can update journal_code_memorial and restore it', async () => {
		await expectAdminCanUpdateAndRestore(TestUsers.ADMIN_ONE);
	});

	it('site_admin can delete and reinsert the singleton', async () => {
		await expectAdminCanDeleteAndReinsert(TestUsers.SITE_ADMIN);
	});

	it('admin can delete and reinsert the singleton', async () => {
		await expectAdminCanDeleteAndReinsert(TestUsers.ADMIN_ONE);
	});
});
