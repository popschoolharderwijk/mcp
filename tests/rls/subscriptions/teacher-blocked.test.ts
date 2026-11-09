import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs, createClientBypassRLS } from '../../db';
import { unwrap, unwrapSingleRow } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
import { TestUsers } from '../test-users';

/**
 * SELECT visibility for subscription billing data:
 * - teachers must not see student subscription / invoice rows
 * - the linked student and privileged staff may
 *
 * Rows are seeded via the service role (bypassing RLS) and removed afterwards.
 */

const agreementId = fixtures.requireAgreementId(TestUsers.STUDENT_009, TestUsers.TEACHER_ALICE);
const FAKE_CUSTOMER_ID = 'cus_rls_test_teacher_blocked';
const FAKE_SUBSCRIPTION_ID = 'sub_rls_test_teacher_blocked';
const FAKE_INVOICE_ID = 'in_rls_test_teacher_blocked';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();
const dbNoRLS = createClientBypassRLS();

beforeAll(async () => {
	initialState = await setupState();

	const sub = unwrapSingleRow(
		await dbNoRLS
			.from('subscriptions')
			.insert({
				lesson_agreement_id: agreementId,
				stripe_subscription_id: FAKE_SUBSCRIPTION_ID,
				stripe_customer_id: FAKE_CUSTOMER_ID,
				stripe_price_id: 'price_rls_test',
				status: 'active',
				default_payment_method_brand: 'ideal',
			})
			.select('id')
			.single(),
	);

	unwrap(
		await dbNoRLS
			.from('subscription_invoices')
			.insert({
				subscription_id: sub.id,
				stripe_invoice_id: FAKE_INVOICE_ID,
				amount_due: 1000,
				amount_paid: 1000,
				currency: 'eur',
				status: 'paid',
			})
			.select('id'),
	);
});

afterAll(async () => {
	unwrap(await dbNoRLS.from('subscription_invoices').delete().eq('stripe_invoice_id', FAKE_INVOICE_ID).select('id'));
	unwrap(
		await dbNoRLS.from('subscriptions').delete().eq('stripe_subscription_id', FAKE_SUBSCRIPTION_ID).select('id'),
	);
	await verifyState(initialState);
});

describe('RLS: teachers cannot see subscription / billing data', () => {
	it('teacher of the agreement sees zero subscription rows', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);
		const rows = unwrap(
			await db.from('subscriptions').select('id').eq('stripe_subscription_id', FAKE_SUBSCRIPTION_ID),
		);
		expect(rows).toHaveLength(0);
	});

	it('teacher of the agreement sees zero subscription_invoices rows', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);
		const rows = unwrap(
			await db.from('subscription_invoices').select('id').eq('stripe_invoice_id', FAKE_INVOICE_ID),
		);
		expect(rows).toHaveLength(0);
	});

	it('student of the agreement sees their subscription row', async () => {
		const db = await createClientAs(TestUsers.STUDENT_009);
		const rows = unwrap(
			await db.from('subscriptions').select('id').eq('stripe_subscription_id', FAKE_SUBSCRIPTION_ID),
		);
		expect(rows).toHaveLength(1);
	});

	it('student of the agreement sees their subscription_invoices row', async () => {
		const db = await createClientAs(TestUsers.STUDENT_009);
		const rows = unwrap(
			await db.from('subscription_invoices').select('id').eq('stripe_invoice_id', FAKE_INVOICE_ID),
		);
		expect(rows).toHaveLength(1);
	});

	it('staff sees the subscription row', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);
		const rows = unwrap(
			await db.from('subscriptions').select('id').eq('stripe_subscription_id', FAKE_SUBSCRIPTION_ID),
		);
		expect(rows).toHaveLength(1);
	});

	it('unrelated teacher sees zero subscription rows', async () => {
		const db = await createClientAs(TestUsers.TEACHER_BOB);
		const rows = unwrap(
			await db.from('subscriptions').select('id').eq('stripe_subscription_id', FAKE_SUBSCRIPTION_ID),
		);
		expect(rows).toHaveLength(0);
	});
});
