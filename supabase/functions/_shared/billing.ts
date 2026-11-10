// Shared billing helpers for Stripe subscription schedules.
// Pure billing math lives in billingHelpers.ts (Bun-testable); this file owns DB/Stripe IO.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type Stripe from 'npm:stripe@17.5.0';
import {
	type AgeTariff,
	assembleBillingContextFromLoadedRows,
	assertHasBillingPhases,
	assertPositiveYearlyCents,
	type BillingComputation,
	type BillingPhase,
	buildAgreementStripeMetadata,
	buildLessonPhasePriceIdempotencyKey,
	buildLessonProductIdempotencyKey,
	buildLessonTypeOptionProductSearchQuery,
	buildPhases,
	buildSetupScheduleIdempotencyKey,
	buildStripeTuitionPriceNickname,
	buildStripeTuitionProductName,
	formatBillingSchoolYearLabel,
	isTerminalScheduleStatus,
	type LessonFrequency,
	pickSharedRecurringMonthlyPriceId,
	resolveStripeSubscriptionId,
	resolveStripeTuitionPriceKind,
	type YearlyResult,
} from './billingHelpers.ts';
import { issueCatchUpInvoice, planCatchUpInvoice } from './catchUpInvoice.ts';
import { filterPhasesAfterCatchUpMonth } from './catchUpInvoiceHelpers.ts';
import { needsCatchUpInvoice } from './paymentLinkHelpers.ts';

import {
	alignFuturePhasePayloads,
	collectKeptSchedulePhases,
	inheritSchedulePaymentMethod,
} from './rebuildScheduleHelpers.ts';
import { writeSubscriptionState } from './subscription-storage.ts';

export type { AgeTariff, YearlyResult };
export { buildSetupScheduleIdempotencyKey };

export interface ScheduleContext {
	lessonAgreementId: string;
	customerId: string;
	defaultPaymentMethod?: string;
	/** When set (setup/checkout flows), concurrent creates share one Stripe schedule. */
	idempotencyKey?: string;
	/** Mandate attempt (SetupIntent id / direct_*); scopes catch-up invoice idempotency. */
	attemptId: string;
}

export interface BuiltSchedule {
	scheduleId: string;
	subscriptionId: string | null;
	yearly: YearlyResult;
	tariff: AgeTariff;
	pricePerLessonCents: number;
	periodStart: string;
	periodEnd: string;
}

interface StripePhasePayload {
	items: Array<Record<string, unknown>>;
	iterations?: number;
	start_date?: number;
	end_date?: number;
	proration_behavior: 'none';
	collection_method: 'charge_automatically';
	metadata: Record<string, string>;
	default_payment_method?: string;
}

async function ensureLessonProduct(stripe: Stripe, lessonTypeOptionId: string, productName: string): Promise<string> {
	const found = await stripe.products.search({
		query: buildLessonTypeOptionProductSearchQuery(lessonTypeOptionId),
		limit: 1,
	});
	const existing = found.data[0];
	if (existing) {
		if (existing.name !== productName) {
			await stripe.products.update(existing.id, { name: productName });
		}
		return existing.id;
	}

	const created = await stripe.products.create(
		{
			name: productName,
			metadata: { lesson_type_option_id: lessonTypeOptionId },
		},
		{ idempotencyKey: buildLessonProductIdempotencyKey(lessonTypeOptionId) },
	);
	return created.id;
}

async function ensureRecurringMonthlyPrice(
	stripe: Stripe,
	productId: string,
	lessonTypeOptionId: string,
	amountCents: number,
	nickname: string,
): Promise<string> {
	const listed = await stripe.prices.list({ product: productId, active: true, limit: 100 });
	const existingId = pickSharedRecurringMonthlyPriceId(listed.data, amountCents);
	if (existingId) return existingId;

	const price = await stripe.prices.create(
		{
			currency: 'eur',
			product: productId,
			unit_amount: amountCents,
			recurring: { interval: 'month', interval_count: 1 },
			nickname,
			metadata: {
				lesson_type_option_id: lessonTypeOptionId,
				amount_cents: String(amountCents),
			},
		},
		{ idempotencyKey: buildLessonPhasePriceIdempotencyKey(lessonTypeOptionId, amountCents) },
	);
	return price.id;
}

function buildStripePhasePayload(
	priceId: string,
	label: string,
	agreementMetadata: Record<string, string>,
	defaultPm?: string,
): StripePhasePayload {
	return {
		items: [{ price: priceId, quantity: 1 }],
		iterations: 1,
		proration_behavior: 'none',
		collection_method: 'charge_automatically',
		metadata: { ...agreementMetadata, phase_label: label },
		...(defaultPm ? { default_payment_method: defaultPm } : {}),
	};
}

async function toStripePhasePayloads(
	stripe: Stripe,
	phases: BillingPhase[],
	agreement: BillingComputation['agreement'],
	tuition: {
		lessonTypeOptionId: string;
		productName: string;
		tariff: AgeTariff;
		monthlyCents: number;
		leftoverCents: number;
	},
	defaultPm?: string,
): Promise<StripePhasePayload[]> {
	const agreementMetadata = buildAgreementStripeMetadata(agreement);
	const productId = await ensureLessonProduct(stripe, tuition.lessonTypeOptionId, tuition.productName);
	const payloads: StripePhasePayload[] = [];
	for (const phase of phases) {
		const nickname = buildStripeTuitionPriceNickname({
			kind: resolveStripeTuitionPriceKind(phase.amountCents, tuition.monthlyCents, tuition.leftoverCents),
			tariff: tuition.tariff,
		});
		const priceId = await ensureRecurringMonthlyPrice(
			stripe,
			productId,
			tuition.lessonTypeOptionId,
			phase.amountCents,
			nickname,
		);
		payloads.push(buildStripePhasePayload(priceId, phase.label, agreementMetadata, defaultPm));
	}
	return payloads;
}

type AgreementRow = BillingComputation['agreement'] & { is_active: boolean };

async function loadAgreementRow(admin: SupabaseClient, lessonAgreementId: string): Promise<AgreementRow> {
	const { data: agreement, error } = await admin
		.from('lesson_agreements')
		.select(
			'id, student_user_id, lesson_type_id, frequency, duration_minutes, day_of_week, start_date, end_date, is_active',
		)
		.eq('id', lessonAgreementId)
		.maybeSingle();
	if (error || !agreement) throw new Error('Lesovereenkomst niet gevonden');
	return { ...agreement, frequency: agreement.frequency as LessonFrequency };
}

async function loadLessonTypeOptionRow(
	admin: SupabaseClient,
	agreement: AgreementRow,
): Promise<{
	id: string;
	price_per_lesson_youth_cents: number | null;
	price_per_lesson_adult_cents: number | null;
}> {
	const { data: option, error } = await admin
		.from('lesson_type_options')
		.select('id, price_per_lesson_youth_cents, price_per_lesson_adult_cents')
		.eq('lesson_type_id', agreement.lesson_type_id)
		.eq('frequency', agreement.frequency)
		.eq('duration_minutes', agreement.duration_minutes)
		.maybeSingle();
	if (error) throw new Error(`Kon prijsopties niet laden: ${error.message}`);
	if (!option) throw new Error('Geen prijs ingesteld voor deze duur/frequentie.');
	return option;
}

async function loadBillingContext(
	admin: SupabaseClient,
	lessonAgreementId: string,
): Promise<{
	billing: BillingComputation;
	lessonTypeOptionId: string;
	lessonTypeName: string | null;
}> {
	const agreement = await loadAgreementRow(admin, lessonAgreementId);
	const [option, studentResult, noPeriodsResult, lessonTypeResult] = await Promise.all([
		loadLessonTypeOptionRow(admin, agreement),
		admin.from('students').select('date_of_birth').eq('user_id', agreement.student_user_id).maybeSingle(),
		admin.from('no_lesson_periods').select('start_date, end_date'),
		admin.from('lesson_types').select('name').eq('id', agreement.lesson_type_id).maybeSingle(),
	]);
	return assembleBillingContextFromLoadedRows({
		agreement,
		option,
		student: studentResult.data,
		noLessonPeriods: noPeriodsResult.data,
		lessonType: lessonTypeResult.data,
		today: new Date().toISOString().slice(0, 10),
	});
}

function buildTuitionProductContext(
	billing: BillingComputation,
	lessonTypeOptionId: string,
	lessonTypeName: string | null,
): {
	lessonTypeOptionId: string;
	productName: string;
	tariff: AgeTariff;
	monthlyCents: number;
	leftoverCents: number;
} {
	return {
		lessonTypeOptionId,
		productName: buildStripeTuitionProductName({
			lessonTypeName,
			durationMinutes: billing.agreement.duration_minutes,
			frequency: billing.agreement.frequency,
		}),
		tariff: billing.tariff,
		monthlyCents: billing.yearly.monthlyCents,
		leftoverCents: billing.yearly.leftoverCents,
	};
}

function firstPhasePriceId(stripePhases: StripePhasePayload[]): string {
	return (stripePhases[0]?.items?.[0] as { price?: string } | undefined)?.price ?? '';
}

async function persistCreatedSchedule(
	admin: SupabaseClient,
	ctx: ScheduleContext,
	schedule: Stripe.SubscriptionSchedule,
	phases: BillingPhase[],
	stripePhases: StripePhasePayload[],
): Promise<string | null> {
	const subscriptionId = resolveStripeSubscriptionId(schedule.subscription);
	await admin.from('lesson_agreements').update({ stripe_schedule_id: schedule.id }).eq('id', ctx.lessonAgreementId);
	await writeSubscriptionState(admin, {
		lesson_agreement_id: ctx.lessonAgreementId,
		stripe_customer_id: ctx.customerId,
		stripe_subscription_id: subscriptionId,
		stripe_price_id: firstPhasePriceId(stripePhases),
		stripe_schedule_id: schedule.id,
		status: 'scheduled',
		current_period_start: new Date(phases[0].startUnix * 1000).toISOString(),
		current_period_end: new Date(phases[0].endUnix * 1000).toISOString(),
		default_payment_method_brand: ctx.defaultPaymentMethod ? 'sepa_debit' : null,
	});
	return subscriptionId;
}

function resolveSchedulePhases(
	billing: BillingComputation,
	today: string,
): { phases: BillingPhase[]; catchUpThroughMonth: string | null } {
	const allPhases = buildPhases(
		billing.periodStart,
		billing.periodEnd,
		billing.yearly.monthlyCents,
		billing.yearly.leftoverCents,
	);
	if (!needsCatchUpInvoice(billing.agreement.start_date, today)) {
		return { phases: allPhases, catchUpThroughMonth: null };
	}
	const catchUpThroughMonth = today.slice(0, 7);
	return {
		phases: filterPhasesAfterCatchUpMonth(allPhases, catchUpThroughMonth),
		catchUpThroughMonth,
	};
}

/** Create a Stripe Subscription Schedule with one phase per billing month. */
export async function createScheduleForAgreement(
	admin: SupabaseClient,
	stripe: Stripe,
	ctx: ScheduleContext,
): Promise<BuiltSchedule> {
	const today = new Date().toISOString().slice(0, 10);
	const { billing, lessonTypeOptionId, lessonTypeName } = await loadBillingContext(admin, ctx.lessonAgreementId);
	assertPositiveYearlyCents(billing.yearly.yearlyCents);

	const { phases, catchUpThroughMonth } = resolveSchedulePhases(billing, today);
	assertHasBillingPhases(phases.length);

	const tuition = buildTuitionProductContext(billing, lessonTypeOptionId, lessonTypeName);
	const agreementMetadata = buildAgreementStripeMetadata(billing.agreement);
	const schoolYearLabel = formatBillingSchoolYearLabel(billing.schoolYear.startYear);
	const stripePhases = await toStripePhasePayloads(
		stripe,
		phases,
		billing.agreement,
		tuition,
		ctx.defaultPaymentMethod,
	);
	const schedule = await stripe.subscriptionSchedules.create(
		{
			customer: ctx.customerId,
			start_date: phases[0].startUnix,
			end_behavior: 'release',
			phases: stripePhases,
			metadata: {
				...agreementMetadata,
				school_year: schoolYearLabel,
			},
		},
		ctx.idempotencyKey ? { idempotencyKey: ctx.idempotencyKey } : undefined,
	);

	const subscriptionId = await persistCreatedSchedule(admin, ctx, schedule, phases, stripePhases);

	if (catchUpThroughMonth) {
		await ensureCatchUpInvoiceForAgreement(admin, stripe, ctx);
	}

	return {
		scheduleId: schedule.id,
		subscriptionId,
		yearly: billing.yearly,
		tariff: billing.tariff,
		pricePerLessonCents: billing.pricePerLessonCents,
		periodStart: billing.periodStart,
		periodEnd: billing.periodEnd,
	};
}

/**
 * Create or settle the catch-up invoice when the mandate arrives after the start month.
 * Safe to call again after a schedule already exists (fills empty drafts / retries collection).
 */
export async function ensureCatchUpInvoiceForAgreement(
	admin: SupabaseClient,
	stripe: Stripe,
	ctx: Pick<ScheduleContext, 'lessonAgreementId' | 'customerId' | 'defaultPaymentMethod' | 'attemptId'>,
): Promise<void> {
	const today = new Date().toISOString().slice(0, 10);
	const { billing } = await loadBillingContext(admin, ctx.lessonAgreementId);
	if (!needsCatchUpInvoice(billing.agreement.start_date, today)) return;

	const plan = planCatchUpInvoice({
		startDate: billing.agreement.start_date,
		today,
		monthlyCents: billing.yearly.monthlyCents,
		leftoverCents: billing.yearly.leftoverCents,
		periodStart: billing.periodStart,
		periodEnd: billing.periodEnd,
	});
	if (!plan) return;

	await issueCatchUpInvoice(stripe, {
		lessonAgreementId: ctx.lessonAgreementId,
		customerId: ctx.customerId,
		defaultPaymentMethod: ctx.defaultPaymentMethod,
		plan,
		attemptId: ctx.attemptId,
	});
}

export interface RebuildResult {
	scheduleId: string;
	keptPhases: number;
	updatedPhases: number;
	newMonthlyCents: number;
	newLeftoverCents: number;
	skipped?: 'no_future_phases';
}

function skippedRebuildResult(scheduleId: string, keptPhases: number, billing: BillingComputation): RebuildResult {
	return {
		scheduleId,
		keptPhases,
		updatedPhases: 0,
		newMonthlyCents: billing.yearly.monthlyCents,
		newLeftoverCents: billing.yearly.leftoverCents,
		skipped: 'no_future_phases',
	};
}

async function loadScheduleForRebuild(
	admin: SupabaseClient,
	stripe: Stripe,
	lessonAgreementId: string,
): Promise<{ scheduleId: string; schedule: Stripe.SubscriptionSchedule }> {
	const { data: agreement } = await admin
		.from('lesson_agreements')
		.select('stripe_schedule_id')
		.eq('id', lessonAgreementId)
		.maybeSingle();
	const scheduleId = agreement?.stripe_schedule_id;
	if (!scheduleId) throw new Error('Geen schedule gekoppeld aan deze lesovereenkomst.');

	const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
	if (isTerminalScheduleStatus(schedule.status)) {
		throw new Error(`Schedule is ${schedule.status}; kan niet worden bijgewerkt.`);
	}
	return { scheduleId, schedule };
}

async function updateFutureSchedulePhases(input: {
	stripe: Stripe;
	scheduleId: string;
	billing: BillingComputation;
	tuition: {
		lessonTypeOptionId: string;
		productName: string;
		tariff: AgeTariff;
		monthlyCents: number;
		leftoverCents: number;
	};
	newPhases: BillingPhase[];
	keptPayloads: Array<Record<string, unknown>>;
	firstFutureIndex: number;
}): Promise<RebuildResult | null> {
	const agreementMetadata = buildAgreementStripeMetadata(input.billing.agreement);
	const futurePayloads = alignFuturePhasePayloads(
		await toStripePhasePayloads(
			input.stripe,
			input.newPhases.slice(input.firstFutureIndex),
			input.billing.agreement,
			input.tuition,
			inheritSchedulePaymentMethod(input.keptPayloads),
		),
		input.firstFutureIndex,
		input.newPhases,
	);
	if (futurePayloads.length === 0) return null;

	await input.stripe.subscriptionSchedules.update(input.scheduleId, {
		phases: [...input.keptPayloads, ...futurePayloads],
		proration_behavior: 'none',
		metadata: {
			...agreementMetadata,
			school_year: formatBillingSchoolYearLabel(input.billing.schoolYear.startYear),
			last_rebuild_at: new Date().toISOString(),
		},
	});

	return {
		scheduleId: input.scheduleId,
		keptPhases: input.keptPayloads.length,
		updatedPhases: futurePayloads.length,
		newMonthlyCents: input.billing.yearly.monthlyCents,
		newLeftoverCents: input.billing.yearly.leftoverCents,
	};
}

/**
 * Recompute prices for an existing schedule and replace only the **future** phases.
 * Past and the currently-active phase are kept verbatim (they have been or are
 * being invoiced). The new tariff therefore takes effect at the next month boundary.
 */
export async function rebuildScheduleForAgreement(
	admin: SupabaseClient,
	stripe: Stripe,
	lessonAgreementId: string,
): Promise<RebuildResult> {
	const { scheduleId, schedule } = await loadScheduleForRebuild(admin, stripe, lessonAgreementId);
	const { billing, lessonTypeOptionId, lessonTypeName } = await loadBillingContext(admin, lessonAgreementId);
	const newPhases = buildPhases(
		billing.periodStart,
		billing.periodEnd,
		billing.yearly.monthlyCents,
		billing.yearly.leftoverCents,
	);
	const { keptPayloads, firstFutureIndex } = collectKeptSchedulePhases(
		schedule.phases ?? [],
		Math.floor(Date.now() / 1000),
	);
	if (firstFutureIndex === -1) return skippedRebuildResult(scheduleId, keptPayloads.length, billing);

	const updated = await updateFutureSchedulePhases({
		stripe,
		scheduleId,
		billing,
		tuition: buildTuitionProductContext(billing, lessonTypeOptionId, lessonTypeName),
		newPhases,
		keptPayloads,
		firstFutureIndex,
	});
	return updated ?? skippedRebuildResult(scheduleId, keptPayloads.length, billing);
}
