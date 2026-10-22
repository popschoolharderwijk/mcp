// Catalog-based Stripe subscription schedules (fase 3a). Pure planning: subscriptionPlanPure.ts.
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type Stripe from 'npm:stripe@17.5.0';
import {
	buildCatchUpInvoiceIdempotencyKey,
	buildCatchUpLineIdempotencyKey,
	catchUpInvoiceDescription,
	catchUpLineDescription,
	resolvePlanFromMonth,
	splitCatchUpMonths,
} from './catchUpInvoicePure.ts';
import { getSafeErrorMessage } from './errors.ts';
import { findRecordedFirstInvoice, recoverFirstInvoice, shouldCatchUp } from './firstInvoiceRecoveryPure.ts';
import {
	buildScheduleFromSubscriptionIdempotencyKey,
	buildScheduleIdempotencyKey,
	collectOpenSchedules,
	findDuplicateScheduleGroups,
	OPEN_SUBSCRIPTION_STATUSES,
	pickScheduleToKeep,
	selectAdoptableSchedule,
} from './scheduleClaimPure.ts';
import { getStripeId } from './stripe.ts';
import { toScheduleError } from './stripeRecoveryPure.ts';
import { writeSubscriptionState } from './subscription-storage.ts';
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

const OPEN_STATUSES: string[] = [...OPEN_SUBSCRIPTION_STATUSES];

export function todayIso(): string {
	return new Date().toISOString().slice(0, 10);
}

interface PlanContext {
	agreementId: string;
	studentUserId: string;
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
	first_invoice_stripe_id: string | null;
}

export async function findOpenSubscription(
	admin: SupabaseClient,
	agreementId: string,
): Promise<SubscriptionRow | null> {
	const { data, error } = await admin
		.from('subscriptions')
		.select(
			'id, stripe_customer_id, stripe_subscription_id, stripe_schedule_id, first_invoice_status, first_invoice_month, first_invoice_stripe_id',
		)
		.eq('lesson_agreement_id', agreementId)
		.in('status', OPEN_STATUSES)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return (data as SubscriptionRow | null) ?? null;
}

async function loadPlanContext(admin: SupabaseClient, agreementId: string): Promise<PlanContext> {
	const { data: agreement } = await admin
		.from('lesson_agreements')
		.select('id, student_user_id, start_date, payment_method, lesson_type_option_id')
		.eq('id', agreementId)
		.maybeSingle();
	if (!agreement) throw new Error('Lesovereenkomst niet gevonden');
	if (agreement.payment_method !== 'stripe') throw new Error('Deze overeenkomst betaalt niet via Stripe');
	if (!agreement.lesson_type_option_id) throw new Error('Overeenkomst heeft geen lesvorm');

	const [{ data: option }, { data: product }, { data: settings }] = await Promise.all([
		admin
			.from('lesson_type_options')
			.select('billing_kind')
			.eq('id', agreement.lesson_type_option_id)
			.maybeSingle(),
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
	if (!product?.stripe_product_id)
		throw new Error('Lesvorm staat nog niet in Stripe: synchroniseer eerst met Stripe');
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
		studentUserId: agreement.student_user_id,
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
	input: {
		agreementId: string;
		customerId: string;
		productId: string;
		first: FirstInvoice;
		pm?: string;
		record?: (invoice: Stripe.Invoice) => Promise<void>;
	},
): Promise<string> {
	const catchUp = Boolean(input.first.lines && input.first.toMonth);
	const from = input.first.month;
	const to = input.first.toMonth ?? from;
	const kind = catchUp ? 'catch_up' : 'first_month';
	const metadata = {
		lesson_agreement_id: input.agreementId,
		kind,
		month: from,
		...(catchUp ? { to_month: to } : {}),
	};
	const description = catchUp ? catchUpInvoiceDescription(from, to) : firstInvoiceDescription(input.first);
	return recoverFirstInvoice({
		invoices: stripe.invoices.list({ customer: input.customerId, limit: 100 }),
		target: { agreementId: input.agreementId, kind, month: from },
		create: () =>
			stripe.invoices.create(
				{
					customer: input.customerId,
					collection_method: 'charge_automatically',
					auto_advance: false,
					pending_invoice_items_behavior: 'exclude',
					description,
					metadata,
					...(input.pm ? { default_payment_method: input.pm } : {}),
				},
				{
					idempotencyKey: catchUp
						? buildCatchUpInvoiceIdempotencyKey(input.agreementId, from, to)
						: `mcp_first_invoice_${input.agreementId}_${from}`,
				},
			),
		record: input.record ?? (async () => {}),
		completeDraft: async (invoice) => {
			// A recovered catch-up draft keeps its original coverage, even across a month rollover.
			if (catchUp && invoice.metadata?.to_month !== to) {
				throw new Error('Inhaalfactuur heeft een andere periode; herstel de opgeslagen factuur eerst');
			}
			const existingMonths = new Set<string>();
			for await (const line of stripe.invoices.listLineItems(invoice.id, { limit: 100 })) {
				if (line.metadata?.lesson_agreement_id === input.agreementId) {
					existingMonths.add(line.metadata.line_month ?? line.metadata.month);
				}
			}
			const lines = input.first.lines ?? [{ ...input.first }];
			for (const line of lines) {
				if (existingMonths.has(line.month)) continue;
				await stripe.invoiceItems.create(
					{
						customer: input.customerId,
						invoice: invoice.id,
						description: catchUp ? catchUpLineDescription(line) : description,
						price_data: {
							currency: 'eur',
							product: input.productId,
							unit_amount: line.amountCents,
							tax_behavior: 'inclusive',
						},
						tax_rates: [line.taxRateId],
						metadata: { ...metadata, line_month: line.month },
					},
					{
						idempotencyKey: catchUp
							? buildCatchUpLineIdempotencyKey(input.agreementId, from, to, line.month)
							: `mcp_first_invoice_item_${input.agreementId}_${from}`,
					},
				);
			}
			await stripe.invoices.finalizeInvoice(invoice.id, { auto_advance: true });
		},
	});
}

async function recordFirstInvoice(
	admin: SupabaseClient,
	agreementId: string,
	first: FirstInvoice,
	invoice: Stripe.Invoice,
) {
	const { error, data } = await admin
		.from('subscriptions')
		.update({
			first_invoice_stripe_id: invoice.id,
			first_invoice_month: first.month,
			first_invoice_due_on: first.dueOn,
			first_invoice_status: invoice.status === 'paid' ? 'paid' : invoice.status === 'draft' ? 'pending' : 'sent',
		})
		.eq('lesson_agreement_id', agreementId)
		.in('status', OPEN_STATUSES)
		.select('id');
	if (error) throw new Error(error.message);
	if (!data?.length) throw new Error('Eerste factuur kon niet worden vastgelegd');
}

export interface ScheduleResult {
	scheduleId: string | null;
	subscriptionId: string | null;
	phases: number;
	firstInvoice: 'sent' | 'pending' | null;
	endBehavior: 'cancel' | 'release';
	/** Set when another path is already building this agreement's schedule (claim not acquired). */
	skipped?: 'in_progress';
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
	return stripe.subscriptionSchedules.create(
		{
			customer: customerId,
			start_date: first.start <= today ? 'now' : startUnix,
			end_behavior: endBehavior,
			phases: phases.map((p) => phasePayload(p, ctx.agreementId, pm)),
			metadata: { lesson_agreement_id: ctx.agreementId },
		} as Stripe.SubscriptionScheduleCreateParams,
		{ idempotencyKey: buildScheduleIdempotencyKey(ctx.agreementId, first.start) },
	);
}

/**
 * Atomic claim so webhooks, complete-mode, Synchroniseer and the daily task can never build
 * a schedule for the same agreement at the same time. Whoever loses the claim does nothing.
 */
async function claimScheduleBuild(admin: SupabaseClient, agreementId: string, customerId: string): Promise<boolean> {
	const { data, error } = await admin.rpc('claim_schedule_build', {
		p_agreement_id: agreementId,
		p_customer_id: customerId,
	});
	if (error) throw new Error(error.message);
	return data === true;
}

async function releaseScheduleBuild(admin: SupabaseClient, agreementId: string): Promise<void> {
	const { error } = await admin.rpc('release_schedule_build', { p_agreement_id: agreementId });
	if (error) console.error('release_schedule_build failed', agreementId, error.message);
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
type SyncInput = { agreementId: string; customerId?: string; defaultPaymentMethod?: string; today?: string };

/** Stripe customer of the student (stored when the payment invitation was opened). */
async function findStudentCustomerId(admin: SupabaseClient, studentUserId: string): Promise<string | null> {
	const { data } = await admin
		.from('stripe_customers')
		.select('stripe_customer_id')
		.eq('user_id', studentUserId)
		.maybeSingle();
	return data?.stripe_customer_id ?? null;
}

export async function syncAgreementSchedule(
	admin: SupabaseClient,
	stripe: Stripe,
	input: SyncInput,
): Promise<ScheduleResult> {
	try {
		return await syncAgreementScheduleInner(admin, stripe, input);
	} catch (err) {
		// Missing tax rate / price / product in the current Stripe account → clear admin message.
		throw toScheduleError(err);
	}
}

async function syncAgreementScheduleInner(
	admin: SupabaseClient,
	stripe: Stripe,
	input: SyncInput,
): Promise<ScheduleResult> {
	const today = input.today ?? todayIso();
	const ctx = await loadPlanContext(admin, input.agreementId);
	const existing = await findOpenSubscription(admin, input.agreementId);
	// Fallback to the student's Stripe customer: recovers a mandate that was given while the
	// schedule could not be built (no subscription row yet).
	const customerId =
		input.customerId ?? existing?.stripe_customer_id ?? (await findStudentCustomerId(admin, ctx.studentUserId));
	if (!customerId) throw new Error('Nog geen Stripe-klant: stuur eerst een betaaluitnodiging');

	// Atomic claim: only one path builds this agreement's schedule at a time.
	const claimed = await claimScheduleBuild(admin, ctx.agreementId, customerId);
	if (!claimed) {
		return {
			scheduleId: existing?.stripe_schedule_id ?? null,
			subscriptionId: existing?.stripe_subscription_id ?? null,
			phases: 0,
			firstInvoice: null,
			endBehavior: 'cancel',
			skipped: 'in_progress',
		};
	}
	try {
		return await buildAgreementSchedule(
			admin,
			stripe,
			input,
			ctx,
			await findOpenSubscription(admin, ctx.agreementId),
			customerId,
			today,
		);
	} finally {
		await releaseScheduleBuild(admin, ctx.agreementId);
	}
}

async function buildAgreementSchedule(
	admin: SupabaseClient,
	stripe: Stripe,
	input: SyncInput,
	ctx: PlanContext,
	existing: SubscriptionRow | null,
	customerId: string,
	today: string,
): Promise<ScheduleResult> {
	const pm = input.defaultPaymentMethod ?? (await resolveDefaultPaymentMethod(stripe, customerId));
	if (!pm) throw new Error('Nog geen machtiging gekoppeld: de klant moet de betaaluitnodiging eerst afronden');
	// Recover the durable invoice even when its DB write failed before a month rollover.
	if (!existing?.first_invoice_status) {
		const invoice = await findRecordedFirstInvoice(stripe.invoices.list({ customer: customerId, limit: 100 }), {
			agreementId: ctx.agreementId,
			month: monthStart(ctx.startDate),
		});
		if (invoice) {
			await recordFirstInvoice(
				admin,
				ctx.agreementId,
				{
					month: monthStart(ctx.startDate),
					dueOn: today,
					amountCents: invoice.total,
					taxRateId: ctx.taxRates.exempt,
					isProrated: false,
				},
				invoice,
			);
			existing = await findOpenSubscription(admin, ctx.agreementId);
		}
	}

	let schedule: Stripe.SubscriptionSchedule | null = existing?.stripe_schedule_id
		? await stripe.subscriptionSchedules.retrieve(existing.stripe_schedule_id)
		: null;
	if (schedule && ['canceled', 'completed'].includes(schedule.status)) schedule = null;
	if (schedule?.status === 'released' && existing?.stripe_subscription_id) {
		schedule = await stripe.subscriptionSchedules.create(
			{ from_subscription: existing.stripe_subscription_id },
			{ idempotencyKey: buildScheduleFromSubscriptionIdempotencyKey(existing.stripe_subscription_id) },
		);
	}
	if (!schedule) {
		// Adopt an open schedule that already exists in Stripe for this agreement (e.g. created by a
		// concurrent webhook before the claim existed) instead of creating a duplicate.
		const listed = await collectOpenSchedules(
			stripe.subscriptionSchedules.list({ customer: customerId, limit: 100 }),
		);
		const adoptable = selectAdoptableSchedule(listed, ctx.agreementId);
		if (adoptable) schedule = await stripe.subscriptionSchedules.retrieve(adoptable.id);
	}
	const running = schedule?.status === 'active';
	if (existing?.first_invoice_status === 'pending' && existing.first_invoice_month) {
		await issuePendingFirstInvoice(admin, stripe, ctx.agreementId, customerId, existing.first_invoice_month, today);
		existing = await findOpenSubscription(admin, ctx.agreementId);
	}

	// Mandate after the start month (no schedule, no first invoice yet) → one catch-up invoice
	// for all missed months; the schedule then starts next month.
	const catchUp = shouldCatchUp({
		startDate: ctx.startDate,
		today,
		storedScheduleId: existing?.stripe_schedule_id,
		firstInvoiceStatus: existing?.first_invoice_status,
	});
	let fromMonth = resolvePlanFromMonth({ startDate: ctx.startDate, today, running: running && !catchUp, catchUp });
	if (!running && existing?.first_invoice_status && existing.first_invoice_month) {
		const recorded = existing.first_invoice_stripe_id
			? await stripe.invoices.retrieve(existing.first_invoice_stripe_id)
			: null;
		const coveredThrough = recorded?.metadata?.to_month ?? existing.first_invoice_month;
		fromMonth = addMonths(coveredThrough, 1);
	}
	const allMonths = await loadFeeMonths(admin, ctx.agreementId, fromMonth, horizonMonthCount(fromMonth));
	const split = catchUp ? splitCatchUpMonths(allMonths, today, ctx.taxRates) : null;
	const plan = buildSubscriptionPlan({
		optionId: ctx.optionId,
		billingKind: ctx.billingKind,
		today,
		startDate: ctx.startDate,
		months: split ? split.rest : allMonths,
		priceIdByLookupKey: ctx.priceIdByLookupKey,
		taxRates: ctx.taxRates,
		continuation: running || Boolean(existing?.first_invoice_status) || Boolean(split),
	});
	if (!plan.ok) throw new Error(plan.error);
	if (running && !catchUp && !existing?.first_invoice_status) {
		// A previously persisted schedule must not hide its missing separate start-month invoice.
		const [firstMonth] = await loadFeeMonths(admin, ctx.agreementId, monthStart(ctx.startDate), 1);
		if (!firstMonth) throw new Error('Geen eerste factuurmaand gevonden');
		plan.firstInvoice = {
			month: firstMonth.month,
			dueOn: ctx.startDate,
			amountCents: firstMonth.amount_cents,
			taxRateId: firstMonth.age_category === '21_plus' ? ctx.taxRates.nl_21_incl : ctx.taxRates.exempt,
			isProrated: firstMonth.is_prorated,
		};
	}
	if (split) {
		plan.firstInvoice = {
			month: split.fromMonth,
			toMonth: split.toMonth,
			dueOn: today,
			amountCents: split.amountCents,
			taxRateId: split.lines[0].taxRateId,
			isProrated: split.lines[0].isProrated,
			lines: split.lines,
		};
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
				record: (invoice) =>
					recordFirstInvoice(admin, ctx.agreementId, plan.firstInvoice as FirstInvoice, invoice),
			});
			firstInvoice = 'sent';
			firstInvoiceFields = { first_invoice_stripe_id: invoiceId };
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

	if (firstInvoice === 'sent') {
		const { error } = await admin
			.from('subscriptions')
			.update({ first_invoice_status: 'sent' })
			.eq('lesson_agreement_id', ctx.agreementId)
			.eq('first_invoice_status', 'pending');
		if (error) throw new Error(error.message);
	}

	if (schedule && running) {
		await updateRunningSchedule(
			stripe,
			schedule,
			ctx,
			pm,
			plan.phases,
			plan.endBehavior,
			addMonths(monthStart(today), 1),
		);
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

	const subscriptionId = schedule ? getStripeId(schedule.subscription) : (existing?.stripe_subscription_id ?? null);
	await writeSubscriptionState(admin, {
		lesson_agreement_id: ctx.agreementId,
		stripe_customer_id: customerId,
		stripe_subscription_id: subscriptionId,
		stripe_price_id: plan.phases[0]?.priceId ?? '',
		stripe_schedule_id: schedule?.id ?? null,
		status: subscriptionId ? (running ? 'active' : 'scheduled') : plan.phases.length > 0 ? 'scheduled' : 'canceled',
	});
	const { error: stateError } = await admin
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
	if (stateError) throw new Error(stateError.message);

	return {
		scheduleId: schedule?.id ?? null,
		subscriptionId,
		phases: plan.phases.length,
		firstInvoice,
		endBehavior: plan.endBehavior,
	};
}

/**
 * Record a rebuild failure so admins see it on the agreement. Without a subscription row yet
 * (the first build failed) an `incomplete` row is created when the Stripe customer is known,
 * flagged needs_rebuild so the daily task and the Synchroniseer button retry it.
 */
export async function recordRebuildError(
	admin: SupabaseClient,
	agreementId: string,
	err: unknown,
	customerId?: string | null,
): Promise<string> {
	const message = getSafeErrorMessage(toScheduleError(err), 'Opbouwen abonnement mislukt');
	const { data: updated } = await admin
		.from('subscriptions')
		.update({ last_rebuild_error: message, needs_rebuild: true })
		.eq('lesson_agreement_id', agreementId)
		.in('status', OPEN_STATUSES)
		.select('id');
	if ((updated ?? []).length > 0) return message;

	let customer = customerId ?? null;
	if (!customer) {
		const { data: agreement } = await admin
			.from('lesson_agreements')
			.select('student_user_id')
			.eq('id', agreementId)
			.maybeSingle();
		if (agreement) customer = await findStudentCustomerId(admin, agreement.student_user_id);
	}
	if (customer) {
		await admin.from('subscriptions').insert({
			lesson_agreement_id: agreementId,
			stripe_customer_id: customer,
			stripe_price_id: '',
			status: 'incomplete',
			needs_rebuild: true,
			last_rebuild_error: message,
		});
	}
	return message;
}

/** Resume a pending first/catch-up draft using its original Stripe metadata coverage. */
async function issuePendingFirstInvoice(
	admin: SupabaseClient,
	stripe: Stripe,
	agreementId: string,
	customerId: string,
	firstMonth: string,
	today: string,
) {
	const existing = await findOpenSubscription(admin, agreementId);
	if (existing?.first_invoice_status !== 'pending') return;
	const ctx = await loadPlanContext(admin, agreementId);
	const recorded = existing.first_invoice_stripe_id
		? await stripe.invoices.retrieve(existing.first_invoice_stripe_id)
		: await findRecordedFirstInvoice(stripe.invoices.list({ customer: customerId, limit: 100 }), {
				agreementId,
				month: firstMonth,
			});
	const toMonth = recorded?.metadata?.kind === 'catch_up' ? recorded.metadata.to_month : null;
	const count = toMonth ? resolveFeeMonthCount(firstMonth, toMonth) : 1;
	const months = await loadFeeMonths(admin, agreementId, firstMonth, count);
	const month = months[0];
	if (!month) throw new Error('Geen eerste factuurmaand gevonden');
	if (!toMonth && ctx.startDate > today) return;
	const split = toMonth ? splitCatchUpMonths(months, toMonth, ctx.taxRates) : null;
	const first: FirstInvoice = split
		? {
				month: split.fromMonth,
				toMonth: split.toMonth,
				dueOn: today,
				amountCents: split.amountCents,
				taxRateId: split.lines[0].taxRateId,
				isProrated: split.lines[0].isProrated,
				lines: split.lines,
			}
		: {
				month: month.month,
				dueOn: today,
				amountCents: month.amount_cents,
				taxRateId: month.age_category === '21_plus' ? ctx.taxRates.nl_21_incl : ctx.taxRates.exempt,
				isProrated: month.is_prorated,
			};
	const pm = await resolveDefaultPaymentMethod(stripe, customerId);
	await issueFirstInvoice(stripe, {
		agreementId,
		customerId,
		productId: ctx.productId,
		pm,
		first,
		record: (invoice) => recordFirstInvoice(admin, agreementId, first, invoice),
	});
	const { error } = await admin
		.from('subscriptions')
		.update({ first_invoice_status: 'sent' })
		.eq('lesson_agreement_id', agreementId)
		.eq('first_invoice_status', 'pending');
	if (error) throw new Error(error.message);
}

function resolveFeeMonthCount(from: string, to: string): number {
	const [fy, fm] = from.split('-').map(Number);
	const [ty, tm] = to.split('-').map(Number);
	return (ty - fy) * 12 + tm - fm + 1;
}

/** Daily invoices share the schedule claim, so two retry paths cannot race. */
export async function issueDueFirstInvoices(admin: SupabaseClient, stripe: Stripe, today: string) {
	const { data: rows, error } = await admin
		.from('subscriptions')
		.select('lesson_agreement_id, stripe_customer_id, first_invoice_month')
		.eq('first_invoice_status', 'pending')
		.lte('first_invoice_due_on', today);
	if (error) throw new Error(error.message);
	const results: Array<{ lesson_agreement_id: string; ok: boolean; error?: string }> = [];
	for (const row of rows ?? []) {
		let claimed = false;
		try {
			claimed = await claimScheduleBuild(admin, row.lesson_agreement_id, row.stripe_customer_id);
			if (!claimed) continue;
			await issuePendingFirstInvoice(
				admin,
				stripe,
				row.lesson_agreement_id,
				row.stripe_customer_id,
				row.first_invoice_month,
				today,
			);
			results.push({ lesson_agreement_id: row.lesson_agreement_id, ok: true });
		} catch (err) {
			results.push({
				lesson_agreement_id: row.lesson_agreement_id,
				ok: false,
				error: getSafeErrorMessage(toScheduleError(err)),
			});
		} finally {
			if (claimed) await releaseScheduleBuild(admin, row.lesson_agreement_id);
		}
	}
	return results;
}

export interface DuplicateSchedulesInfo {
	lesson_agreement_id: string;
	schedule_ids: string[];
	stored_schedule_id: string | null;
	keep_schedule_id: string;
}

/** Agreements with more than one open schedule in Stripe (would debit twice). */
export async function detectDuplicateSchedules(
	admin: SupabaseClient,
	stripe: Stripe,
): Promise<DuplicateSchedulesInfo[]> {
	const listed = await collectOpenSchedules(stripe.subscriptionSchedules.list({ limit: 100 }));
	const groups = findDuplicateScheduleGroups(listed);
	const result: DuplicateSchedulesInfo[] = [];
	for (const group of groups) {
		const existing = await findOpenSubscription(admin, group.agreementId);
		const stored = existing?.stripe_schedule_id ?? null;
		result.push({
			lesson_agreement_id: group.agreementId,
			schedule_ids: group.scheduleIds,
			stored_schedule_id: stored,
			keep_schedule_id: pickScheduleToKeep(group.scheduleIds, stored),
		});
	}
	return result;
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
		// Rows without a schedule are only retried when flagged (first build failed).
		.or('stripe_schedule_id.not.is.null,needs_rebuild.eq.true')
		.in('status', OPEN_STATUSES);
	const horizonLimit = addMonths(monthStart(options.today), 12);
	const due = (
		(rows ?? []) as unknown as Array<{
			lesson_agreement_id: string;
			needs_rebuild: boolean;
			schedule_horizon_end: string | null;
			lesson_agreements: { lesson_type_id: string } | null;
		}>
	).filter(
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
