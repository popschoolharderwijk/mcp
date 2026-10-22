import { beforeAll, describe, expect, it } from 'bun:test';
import { resolveStripeSubscriptionId } from '../../../supabase/functions/sync-stripe-subscription/resolveSubscriptionIdHelpers';

type SubscriptionRowResult = {
	data: { stripe_subscription_id: string | null; stripe_schedule_id: string | null } | null;
	error: { message: string } | null;
};

function createAdminMock(subscriptionResult: SubscriptionRowResult) {
	return {
		from: (table: string) => {
			if (table !== 'subscriptions') {
				throw new Error(`Unexpected table: ${table}`);
			}
			return {
				select: () => ({
					eq: () => ({
						order: () => ({
							limit: () => ({
								maybeSingle: () => Promise.resolve(subscriptionResult),
							}),
						}),
					}),
				}),
			};
		},
	};
}

function createStripeMock(schedule: { released_subscription?: unknown; subscription?: string | null; status: string }) {
	return {
		subscriptionSchedules: {
			retrieve: (_scheduleId: string) => Promise.resolve(schedule),
		},
	};
}

async function readJson(response: Response): Promise<unknown> {
	return response.json();
}

describe('resolveStripeSubscriptionId', () => {
	let resolveFn: typeof resolveStripeSubscriptionId;

	beforeAll(async () => {
		resolveFn = resolveStripeSubscriptionId;
	});

	it('returns resolved subscription when stripe subscription id is provided directly', async () => {
		const result = await resolveFn({} as never, {} as never, {
			stripeSubscriptionId: 'sub_direct',
			lessonAgreementId: 'agr-1',
		});
		expect(result).toEqual({
			ok: true,
			resolved: {
				stripeSubscriptionId: 'sub_direct',
				scheduleIdFromDb: null,
				lessonAgreementIdHint: 'agr-1',
			},
		});
	});

	it('returns missing subscription response when no identifiers are provided', async () => {
		const result = await resolveFn({} as never, {} as never, {});
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.response.status).toBe(400);
		expect(await readJson(result.response)).toEqual({
			error: 'Geen Stripe-abonnement gevonden om te syncen',
		});
	});

	it('returns resolved subscription from lesson agreement row', async () => {
		const admin = createAdminMock({
			data: { stripe_subscription_id: 'sub_row', stripe_schedule_id: 'sched_1' },
			error: null,
		});
		const result = await resolveFn(admin as never, {} as never, { lessonAgreementId: 'agr-1' });
		expect(result).toEqual({
			ok: true,
			resolved: {
				stripeSubscriptionId: 'sub_row',
				scheduleIdFromDb: 'sched_1',
				lessonAgreementIdHint: 'agr-1',
			},
		});
	});

	it('returns missing subscription response when row has no stripe ids', async () => {
		const admin = createAdminMock({
			data: { stripe_subscription_id: null, stripe_schedule_id: null },
			error: null,
		});
		const result = await resolveFn(admin as never, {} as never, { lessonAgreementId: 'agr-1' });
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.response.status).toBe(400);
		expect(await readJson(result.response)).toEqual({
			error: 'Geen Stripe-abonnement gevonden om te syncen',
		});
	});

	it('returns pending schedule response when schedule has no released subscription', async () => {
		const admin = createAdminMock({
			data: { stripe_subscription_id: null, stripe_schedule_id: 'sched_pending' },
			error: null,
		});
		const stripe = createStripeMock({
			released_subscription: null,
			subscription: null,
			status: 'not_started',
		});
		const result = await resolveFn(admin as never, stripe as never, { lessonAgreementId: 'agr-1' });
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.response.status).toBe(200);
		expect(await readJson(result.response)).toEqual({
			synced: false,
			info: 'Schedule status is not_started; nog geen actief abonnement gekoppeld.',
			schedule_status: 'not_started',
		});
	});

	it('resolves subscription id from stripe schedule when db row only has schedule id', async () => {
		const admin = createAdminMock({
			data: { stripe_subscription_id: null, stripe_schedule_id: 'sched_1' },
			error: null,
		});
		const stripe = createStripeMock({
			released_subscription: 'sub_released',
			subscription: 'sub_active',
			status: 'released',
		});
		const result = await resolveFn(admin as never, stripe as never, { lessonAgreementId: 'agr-1' });
		expect(result).toEqual({
			ok: true,
			resolved: {
				stripeSubscriptionId: 'sub_released',
				scheduleIdFromDb: 'sched_1',
				lessonAgreementIdHint: 'agr-1',
			},
		});
	});

	it('uses subscription fallback from stripe schedule when released subscription is absent', async () => {
		const admin = createAdminMock({
			data: { stripe_subscription_id: null, stripe_schedule_id: 'sched_1' },
			error: null,
		});
		const stripe = createStripeMock({
			released_subscription: null,
			subscription: 'sub_active',
			status: 'active',
		});
		const result = await resolveFn(admin as never, stripe as never, { lessonAgreementId: 'agr-1' });
		expect(result).toEqual({
			ok: true,
			resolved: {
				stripeSubscriptionId: 'sub_active',
				scheduleIdFromDb: 'sched_1',
				lessonAgreementIdHint: 'agr-1',
			},
		});
	});
});
