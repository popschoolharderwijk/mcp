import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs } from '../../db';
import { expectInsufficientPrivilege, unwrap, unwrapError } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
import { type TestUser, TestUsers } from '../test-users';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

const studentUserId = fixtures.requireUserId(TestUsers.STUDENT_009);
const agreementId = fixtures.requireAgreementId(TestUsers.STUDENT_009, TestUsers.TEACHER_ALICE);

/**
 * Subscription tables are written exclusively by the Stripe webhook (service role).
 * Authenticated INSERT is rejected by RLS; UPDATE/DELETE match zero rows (no write policy).
 *
 * SELECT visibility (asserted in teacher-blocked.test.ts):
 *  - stripe_customers: owner or privileged
 *  - subscriptions / subscription_invoices: privileged or the student of the linked lesson_agreement
 */

const WRITE_USERS: TestUser[] = [TestUsers.STUDENT_009, TestUsers.STAFF_ONE, TestUsers.ADMIN_ONE];

const subscriptionInsert = {
	lesson_agreement_id: agreementId,
	stripe_subscription_id: 'sub_rls_write_probe',
	stripe_customer_id: 'cus_rls_write_probe',
	stripe_price_id: 'price_rls_write_probe',
	status: 'active' as const,
};

async function expectStripeCustomerWritesBlocked(user: TestUser) {
	const db = await createClientAs(user);
	expectInsufficientPrivilege(
		unwrapError(
			await db
				.from('stripe_customers')
				.insert({ user_id: studentUserId, stripe_customer_id: `cus_rls_${user}` })
				.select(),
		),
	);
	expect(
		unwrap(
			await db
				.from('stripe_customers')
				.update({ stripe_customer_id: 'cus_rls_hacked' })
				.eq('user_id', studentUserId)
				.select('user_id'),
		),
	).toHaveLength(0);
	expect(
		unwrap(await db.from('stripe_customers').delete().eq('user_id', studentUserId).select('user_id')),
	).toHaveLength(0);
}

async function expectSubscriptionWritesBlocked(user: TestUser) {
	const db = await createClientAs(user);
	expectInsufficientPrivilege(unwrapError(await db.from('subscriptions').insert(subscriptionInsert).select()));
	expect(
		unwrap(
			await db
				.from('subscriptions')
				.update({ status: 'canceled' })
				.eq('stripe_subscription_id', subscriptionInsert.stripe_subscription_id)
				.select('id'),
		),
	).toHaveLength(0);
	expect(
		unwrap(
			await db
				.from('subscriptions')
				.delete()
				.eq('stripe_subscription_id', subscriptionInsert.stripe_subscription_id)
				.select('id'),
		),
	).toHaveLength(0);
}

describe('RLS: stripe_customers writes are blocked for authenticated users', () => {
	for (const user of WRITE_USERS) {
		it(`${user} cannot insert, update or delete stripe_customers`, async () => {
			await expectStripeCustomerWritesBlocked(user);
		});
	}
});

describe('RLS: subscriptions writes are blocked for authenticated users', () => {
	for (const user of [...WRITE_USERS, TestUsers.TEACHER_ALICE]) {
		it(`${user} cannot insert, update or delete subscriptions`, async () => {
			await expectSubscriptionWritesBlocked(user);
		});
	}
});

describe('RLS: authenticated SELECT on subscription tables succeeds', () => {
	it('student SELECT on subscriptions returns an empty list when none exist for them', async () => {
		const db = await createClientAs(TestUsers.STUDENT_009);
		const data = unwrap(await db.from('subscriptions').select('id'));
		expect(data).toHaveLength(0);
	});

	it('staff SELECT on subscriptions returns an empty list when none are seeded', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);
		const data = unwrap(await db.from('subscriptions').select('id'));
		expect(data).toHaveLength(0);
	});
});
