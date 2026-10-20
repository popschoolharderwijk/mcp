// Catalog-based Stripe subscription schedules (fase 3a). Pure planning: subscriptionPlanPure.ts.
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type Stripe from 'npm:stripe@17.5.0';
import { getSafeErrorMessage } from './errors.ts';
import { getStripeId } from './stripe.ts';
import {
	addMonths,
	buildSubscriptionPlan,
	type FeeMonth,
	type FirstInvoice,
	firstInvoiceDescription,
	horizonMonthCount,
	monthStart,
	monthStartUnix,
	type PlannedPhase,
	type TaxRateIds,
} from './subscriptionPlanPure.ts';
import { writeSubscriptionState } from './subscription-storage.ts';

const OPEN_STATUSES = ['scheduled', 'trialing', 'active', 'past_due', 'unpaid', 'incomplete', 'paused'];

export function todayIso(): string {
	return new Date().toISOString().slice(0, 10);
}

interface PlanContext {
	agreementId: string;
	optionId: string;
	billingKind: 'monthly' | 'one_off';
	startDate: string;
	productId: string;
	priceIdByLookupKey: Record<string, string>;
	taxRates: TaxRateIds;
}

export interface SubscriptionRow {
	id: string;
	stripe_customer_id: string;
	stripe_subscription_id: string | null;
	stripe_schedule_id: string | null;
	first_invoice_status: string | null;
	first_invoice_month: string | null;
}

export async function findOpenSubscription(admin: SupabaseClient, agreementId: string): Promise<SubscriptionRow | null> {
	const { data } = await admin
		.from('subscriptions')
		.select('id, stripe_customer_id, stripe_subscription_id, stripe_schedule_id, first_invoice_status, first_invoice_month')
		.eq('lesson_agreement_id', agreementId)
		.in('status', OPEN_STATUSES)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();
	return (data as SubscriptionRow | null) ?? null;
}

async function loadPlanContext(admin: SupabaseClient, agreementId: string): Promise<PlanContext> {
	const { data: agreement } = await admin
		.from('lesson_agreements')
		.select('id, start_date, payment_method, lesson_type_option_id')
		.eq('id', agreementId)
		.maybeSingle();
	if (!agreement) throw new Error('Lesovereenkomst niet gevonden');
	if (agreement.payment_method !== 'stripe') throw new Error('Deze overeenkomst betaalt niet via Stripe');
	if (!agreement.lesson_type_option_id) throw new Error('Overeenkomst heeft geen lesvorm');

	const [{ data: option }, { data: product }, { data: settings }] = await Promise.all([
		admin.from('lesson_type_options').select('billing_kind').eq('id', agreement.lesson_type_option_id).maybeSingle(),
		admin
			.from('stripe_catalog_products')
			.select('id, stripe_product_id, stripe_catalog_prices(lookup_key, stripe_price_id, is_active_in_stripe)')
			.eq('lesson_type_option_id', agreement.lesson_type_option_id)
			.maybeSingle(),
		admin
			.from('accounting_settings')
			.select('stripe_tax_rate_21_id, stripe_tax_rate_exempt_id')
			.eq('id', true)
			.maybeSingle(),
	]);
	if (!product?.stripe_product_id) throw new Error('Lesvorm staat nog niet in Stripe: synchroniseer eerst met Stripe');
	if (!settings?.stripe_tax_rate_21_id || !settings?.stripe_tax_rate_exempt_id) {
		throw new Error('Btw-tarieven ontbreken in Stripe: synchroniseer eerst met Stripe');
	}
	const prices = (product.stripe_catalog_prices ?? []) as Array<{
		lookup_key: string;
		stripe_price_id: string;
		is_active_in_stripe: boolean;
	}>;
	return {
		agreementId,
		optionId: agreement.lesson_type_option_id,
		billingKind: (option?.billing_kind ?? 'monthly') as 'monthly' | 'one_off',
		startDate: agreement.start_date,
		productId: product.stripe_product_id,
		priceIdByLookupKey: Object.fromEntries(
			prices.filter((p) => p.is_active_in_stripe).map((p) => [p.lookup_key, p.stripe_price_id]),
		),
		taxRates: { nl_21_incl: settings.stripe_tax_rate_21_id, exempt: settings.stripe_tax_rate_exempt_id },
	};
}

export async function loadFeeMonths(admin: SupabaseClient, agreementId: string, fromMonth: string, count: number) {
	const { data, error } = await admin.rpc('agreement_fee_months', {
		p_agreement_id: agreementId,
		p_from_month: fromMonth,
		p_months: count,
	});
	if (error) throw new Error(error.message);
	return ((data ?? []) as FeeMonth[]).map((m) => ({ ...m, amount_cents: Number(m.amount_cents) }));
}

function phasePayload(phase: PlannedPhase, agreementId: string, pm: string | undefined) {
	return {
		items: [{ price: phase.priceId, quantity: 1, tax_rates: [phase.taxRateId] }],
		end_date: monthStartUnix(phase.end),
		proration_behavior: 'none' as const,
		collection_method: 'charge_automatically' as const,
		metadata: { lesson_agreement_id: agreementId, phase_start: phase.start },
		...(phase.trial ? { trial: true } : {}),
		...(pm ? { default_payment_method: pm } : {}),
	};
}

async function resolveDefaultPaymentMethod(stripe: Stripe, customerId: string): Promise<string | undefined> {
	const customer = await stripe.customers.retrieve(customerId);
	if (customer.deleted) throw new Error('Stripe-klant is verwijderd');
	return getStripeId(customer.invoice_settings?.default_payment_method) ?? undefined;
}

export async function issueFirstInvoice(
	stripe: Stripe,
	input: { agreementId: string; customerId: string; productId: string; first: FirstInvoice; pm?: string },
): Promise<string> {
	const description = firstInvoiceDescription(input.first);
	const metadata = { lesson_agreement_id: input.agreementId, kind: 'first_month', month: input.first.month };
	const invoice = await stripe.invoices.create(
		{
			customer: input.customerId,
			collection_method: 'charge_automatically',
			auto_advance: true,
			pending_invoice_items_behavior: 'exclude',
			description,
			metadata,
			...(input.pm ? { default_payment_method: input.pm } : {}),
		},
		{ idempotencyKey: `mcp_first_invoice_${input.agreementId}_${input.first.month}` },
	);
	await stripe.invoiceItems.create(
		{
			customer: input.customerId,
			invoice: invoice.id,
			description,
			price_data: {
				currency: 'eur',
				product: input.productId,
				unit_amount: input.first.amountCents,
				tax_behavior: 'inclusive',
			},
			tax_rates: [input.first.taxRateId],
			metadata,
		},
		{ idempotencyKey: `mcp_first_invoice_item_${input.agreementId}_${input.first.month}` },
	);
	await stripe.invoices.finalizeInvoice(invoice.id, { auto_advance: true });
	return invoice.id;
}

export interface ScheduleResult {
	scheduleId: string | null;
	subscriptionId: string | null;
	phases: number;
	firstInvoice: 'sent' | 'pending' | null;
	endBehavior: 'cancel' | 'release';
}

async function createNewSchedule(
	stripe: Stripe,
	ctx: PlanContext,
	customerId: string,
	pm: string | undefined,
	phases: PlannedPhase[],
	endBehavior: 'cancel' | 'release',
	today: string,
): Promise<Stripe.SubscriptionSchedule> {
	const first = phases[0];
	const startUnix = monthStartUnix(first.start);
	return stripe.subscriptionSchedules.create({
		customer: customerId,
		start_date: first.start <= today ? 'now' : startUnix,
		end_behavior: endBehavior,
		phases: phases.map((p) => phasePayload(p, ctx.agreementId, pm)),
		metadata: { lesson_agreement_id: ctx.agreementId },
	} as Stripe.SubscriptionScheduleCreateParams);
}

/** Keep the running phase (already invoiced) up to next month; replace everything after it. */
async function updateRunningSchedule(
	stripe: Stripe,
	schedule: Stripe.SubscriptionSchedule,
	ctx: PlanContext,
	pm: string | undefined,
	phases: PlannedPhase[],
	endBehavior: 'cancel' | 'release',
	nextMonth: string,
): Promise<void> {
	const current = schedule.current_phase;
	const running = schedule.phases.find((p) => current && p.start_date === current.start_date);
	const kept = running
		? [
				{
					items: running.items.map((item) => ({
						price: getStripeId(item.price) as string,
						quantity: item.quantity ?? 1,
						tax_rates: (item.tax_rates ?? []).map((t) => getStripeId(t) as string),
					})),
					start_date: running.start_date,
					end_date: monthStartUnix(nextMonth),
					proration_behavior: 'none' as const,
					collection_method: 'charge_automatically' as const,
					metadata: { lesson_agreement_id: ctx.agreementId },
					...(running.trial_end ? { trial_end: running.trial_end } : {}),
					...(pm ? { default_payment_method: pm } : {}),
				},
			]
		: [];
	await stripe.subscriptionSchedules.update(schedule.id, {
		end_behavior: endBehavior,
		proration_behavior: 'none',
		phases: [...kept, ...phases.map((p) => phasePayload(p, ctx.agreementId, pm))],
		metadata: { lesson_agreement_id: ctx.agreementId, last_rebuild_at: new Date().toISOString() },
	} as Stripe.SubscriptionScheduleUpdateParams);
}

/**
 * Create or rebuild the catalog-based schedule for one Stripe agreement.
 * Idempotent: a second call with unchanged data produces the same phases.
 */
export async function syncAgreementSchedule(
	admin: SupabaseClient,
	stripe: Stripe,
	input: { agreementId: string; customerId?: string; defaultPaymentMethod?: string; today?: string },
): Promise<ScheduleResult> {
	const today = input.today ?? todayIso();
	const ctx = await loadPlanContext(admin, input.agreementId);
	const existing = await findOpenSubscription(admin, input.agreementId);
	const customerId = input.customerId ?? existing?.stripe_customer_id;
	if (!customerId) throw new Error('Nog geen Stripe-klant: stuur eerst een betaaluitnodiging');
	const pm = input.defaultPaymentMethod ?? (await resolveDefaultPaymentMethod(stripe, customerId));

	let schedule = existing?.stripe_schedule_id
		? await stripe.subscriptionSchedules.retrieve(existing.stripe_schedule_id)
		: null;
	if (schedule && ['canceled', 'completed'].includes(schedule.status)) schedule = null;
	if (schedule?.status === 'released' && existing?.stripe_subscription_id) {
		schedule = await stripe.subscriptionSchedules.create({ from_subscription: existing.stripe_subscription_id });
	}
	const running = schedule?.status === 'active';

	const currentMonth = monthStart(today > ctx.startDate ? today : ctx.startDate);
	const fromMonth = running ? addMonths(monthStart(today), 1) : currentMonth;
	const months = await loadFeeMonths(admin, ctx.agreementId, fromMonth, horizonMonthCount(fromMonth));
	const plan = buildSubscriptionPlan({
		optionId: ctx.optionId,
		billingKind: ctx.billingKind,
		today,
		startDate: ctx.startDate,
		months,
		priceIdByLookupKey: ctx.priceIdByLookupKey,
		taxRates: ctx.taxRates,
		continuation: running,
	});
	if (!plan.ok) throw new Error(plan.error);

	if (schedule && running) {
		await updateRunningSchedule(stripe, schedule, ctx, pm, plan.phases, plan.endBehavior, fromMonth);
	} else if (schedule && plan.phases.length > 0) {
		await stripe.subscriptionSchedules.update(schedule.id, {
			end_behavior: plan.endBehavior,
			proration_behavior: 'none',
			phases: plan.phases.map((p, i) => ({
				...phasePayload(p, ctx.agreementId, pm),
				...(i === 0 ? { start_date: p.start <= today ? 'now' : monthStartUnix(p.start) } : {}),
			})),
		} as Stripe.SubscriptionScheduleUpdateParams);
	} else if (schedule && plan.phases.length === 0) {
		await stripe.subscriptionSchedules.cancel(schedule.id);
		schedule = null;
	} else if (plan.phases.length > 0) {
		schedule = await createNewSchedule(stripe, ctx, customerId, pm, plan.phases, plan.endBehavior, today);
	}

	// First (partial or running) month as a separate invoice, only once per agreement.
	let firstInvoice: ScheduleResult['firstInvoice'] = null;
	let firstInvoiceFields: Record<string, unknown> = {};
	if (plan.firstInvoice && !existing?.first_invoice_status) {
		if (plan.firstInvoice.dueOn <= today) {
			const invoiceId = await issueFirstInvoice(stripe, {
				agreementId: ctx.agreementId,
				customerId,
				productId: ctx.productId,
				first: plan.firstInvoice,
				pm,
			});
			firstInvoice = 'sent';
			firstInvoiceFields = { first_invoice_status: 'sent', first_invoice_stripe_id: invoiceId };
		} else {
			firstInvoice = 'pending';
			firstInvoiceFields = { first_invoice_status: 'pending' };
		}
		firstInvoiceFields = {
			...firstInvoiceFields,
			first_invoice_month: plan.firstInvoice.month,
			first_invoice_due_on: plan.firstInvoice.dueOn,
		};
	}

	const subscriptionId = schedule ? getStripeId(schedule.subscription) : (existing?.stripe_subscription_id ?? null);
	await writeSubscriptionState(admin, {
		lesson_agreement_id: ctx.agreementId,
		stripe_customer_id: customerId,
		stripe_subscription_id: subscriptionId,
		stripe_price_id: plan.phases[0]?.priceId ?? '',
		stripe_schedule_id: schedule?.id ?? null,
		status: subscriptionId ? (running ? 'active' : 'scheduled') : plan.phases.length > 0 ? 'scheduled' : 'canceled',
	});
	await admin
		.from('subscriptions')
		.update({
			needs_rebuild: false,
			schedule_horizon_end: plan.horizonEnd,
			last_rebuilt_at: new Date().toISOString(),
			last_rebuild_error: null,
			...firstInvoiceFields,
		})
		.eq('lesson_agreement_id', ctx.agreementId)
		.in('status', [...OPEN_STATUSES, 'canceled']);

	return {
		scheduleId: schedule?.id ?? null,
		subscriptionId,
		phases: plan.phases.length,
		firstInvoice,
		endBehavior: plan.endBehavior,
	};
}

/** Record a rebuild failure without leaking internals. */
export async function recordRebuildError(admin: SupabaseClient, agreementId: string, err: unknown): Promise<string> {
	const message = getSafeErrorMessage(err, 'Opbouwen abonnement mislukt');
	await admin
		.from('subscriptions')
		.update({ last_rebuild_error: message })
		.eq('lesson_agreement_id', agreementId)
		.in('status', OPEN_STATUSES);
	return message;
}

/** Issue first invoices whose due date has arrived (amount recomputed from the source). */
export async function issueDueFirstInvoices(admin: SupabaseClient, stripe: Stripe, today: string) {
	const { data: rows } = await admin
		.from('subscriptions')
		.select('lesson_agreement_id, stripe_customer_id, first_invoice_month')
		.eq('first_invoice_status', 'pending')
		.lte('first_invoice_due_on', today);
	const results: Array<{ lesson_agreement_id: string; ok: boolean; error?: string }> = [];
	for (const row of rows ?? []) {
		try {
			const ctx = await loadPlanContext(admin, row.lesson_agreement_id);
			const [month] = await loadFeeMonths(admin, row.lesson_agreement_id, row.first_invoice_month, 1);
			if (!month || month.amount_cents <= 0) {
				await admin.from('subscriptions').update({ first_invoice_status: null }).eq('lesson_agreement_id', row.lesson_agreement_id);
				continue;
			}
			const pm = await resolveDefaultPaymentMethod(stripe, row.stripe_customer_id);
			const invoiceId = await issueFirstInvoice(stripe, {
				agreementId: row.lesson_agreement_id,
				customerId: row.stripe_customer_id,
				productId: ctx.productId,
				pm,
				first: {
					month: month.month,
					dueOn: today,
					amountCents: month.amount_cents,
					taxRateId: month.age_category === '21_plus' ? ctx.taxRates.nl_21_incl : ctx.taxRates.exempt,
					isProrated: month.is_prorated,
				},
			});
			await admin
				.from('subscriptions')
				.update({ first_invoice_status: 'sent', first_invoice_stripe_id: invoiceId })
				.eq('lesson_agreement_id', row.lesson_agreement_id)
				.eq('first_invoice_status', 'pending');
			results.push({ lesson_agreement_id: row.lesson_agreement_id, ok: true });
		} catch (err) {
			results.push({ lesson_agreement_id: row.lesson_agreement_id, ok: false, error: getSafeErrorMessage(err) });
		}
	}
	return results;
}

/** Rebuild every subscription flagged needs_rebuild or with a short horizon. */
export async function processPendingRebuilds(
	admin: SupabaseClient,
	stripe: Stripe,
	options: { today: string; includeHorizon: boolean; lessonTypeId?: string },
) {
	const { data: rows } = await admin
		.from('subscriptions')
		.select('lesson_agreement_id, needs_rebuild, schedule_horizon_end, lesson_agreements!inner(lesson_type_id)')
		.not('stripe_schedule_id', 'is', null)
		.in('status', OPEN_STATUSES);
	const horizonLimit = addMonths(monthStart(options.today), 12);
	const due = ((rows ?? []) as Array<{
		lesson_agreement_id: string;
		needs_rebuild: boolean;
		schedule_horizon_end: string | null;
		lesson_agreements: { lesson_type_id: string } | null;
	}>).filter(
		(r) =>
			(!options.lessonTypeId || r.lesson_agreements?.lesson_type_id === options.lessonTypeId) &&
			(r.needs_rebuild ||
				(options.includeHorizon && (!r.schedule_horizon_end || r.schedule_horizon_end <= horizonLimit))),
	);
	const results: Array<{ lesson_agreement_id: string; ok: boolean; error?: string }> = [];
	for (const row of due) {
		try {
			await syncAgreementSchedule(admin, stripe, { agreementId: row.lesson_agreement_id, today: options.today });
			results.push({ lesson_agreement_id: row.lesson_agreement_id, ok: true });
		} catch (err) {
			results.push({
				lesson_agreement_id: row.lesson_agreement_id,
				ok: false,
				error: await recordRebuildError(admin, row.lesson_agreement_id, err),
			});
		}
	}
	return results;
}
