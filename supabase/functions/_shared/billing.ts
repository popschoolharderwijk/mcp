// Shared billing helpers for Stripe subscription schedules.
// Pure billing math lives in billingPure.ts (Bun-testable); this file owns DB/Stripe IO.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type Stripe from 'npm:stripe@17.5.0';
import {
	type AgeTariff,
	assertHasBillingPhases,
	assertPositiveYearlyCents,
	type BillingComputation,
	type BillingPhase,
	buildBillingComputationFromLoadedData,
	buildPhases,
	isTerminalScheduleStatus,
	type LessonFrequency,
	resolveStripeSubscriptionId,
	type YearlyResult,
} from './billingPure.ts';

import {
	alignFuturePhasePayloads,
	collectKeptSchedulePhases,
	inheritSchedulePaymentMethod,
} from './rebuildSchedulePure.ts';
import { writeSubscriptionState } from './subscription-storage.ts';

export type { AgeTariff, YearlyResult };

export interface ScheduleContext {
	lessonAgreementId: string;
	customerId: string;
	defaultPaymentMethod?: string;
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

async function ensureLessonProduct(stripe: Stripe, lessonAgreementId: string): Promise<string> {
	const product = await stripe.products.create({
		name: `Lesgeld ${lessonAgreementId}`,
		metadata: { lesson_agreement_id: lessonAgreementId },
	});
	return product.id;
}

async function createPhasePrice(
	stripe: Stripe,
	productId: string,
	amountCents: number,
	label: string,
	lessonAgreementId: string,
): Promise<string> {
	const price = await stripe.prices.create({
		currency: 'eur',
		product: productId,
		unit_amount: amountCents,
		recurring: { interval: 'month', interval_count: 1 },
		nickname: `Lesgeld ${label}`,
		metadata: { phase_label: label, lesson_agreement_id: lessonAgreementId },
	});
	return price.id;
}

function buildStripePhasePayload(
	priceId: string,
	label: string,
	lessonAgreementId: string,
	defaultPm?: string,
): StripePhasePayload {
	return {
		items: [{ price: priceId, quantity: 1 }],
		iterations: 1,
		proration_behavior: 'none',
		collection_method: 'charge_automatically',
		metadata: { phase_label: label, lesson_agreement_id: lessonAgreementId },
		...(defaultPm ? { default_payment_method: defaultPm } : {}),
	};
}

async function toStripePhasePayloads(
	stripe: Stripe,
	phases: BillingPhase[],
	lessonAgreementId: string,
	defaultPm?: string,
): Promise<StripePhasePayload[]> {
	const productId = await ensureLessonProduct(stripe, lessonAgreementId);
	const payloads: StripePhasePayload[] = [];
	for (const phase of phases) {
		const priceId = await createPhasePrice(stripe, productId, phase.amountCents, phase.label, lessonAgreementId);
		payloads.push(buildStripePhasePayload(priceId, phase.label, lessonAgreementId, defaultPm));
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

async function loadLessonTypeOptionPrices(
	admin: SupabaseClient,
	agreement: AgreementRow,
): Promise<{
	price_per_lesson_under_21_cents: number | null;
	price_per_lesson_adult_cents: number | null;
}> {
	const { data: option, error } = await admin
		.from('lesson_type_options')
		.select('price_per_lesson_under_21_cents, price_per_lesson_adult_cents')
		.eq('lesson_type_id', agreement.lesson_type_id)
		.eq('frequency', agreement.frequency)
		.eq('duration_minutes', agreement.duration_minutes)
		.maybeSingle();
	if (error) throw new Error(`Kon prijsopties niet laden: ${error.message}`);
	if (!option) throw new Error('Geen prijs ingesteld voor deze duur/frequentie.');
	return option;
}

async function loadBillingLookups(admin: SupabaseClient, agreement: AgreementRow) {
	const [option, studentResult, noPeriodsResult] = await Promise.all([
		loadLessonTypeOptionPrices(admin, agreement),
		admin.from('students').select('date_of_birth').eq('user_id', agreement.student_user_id).maybeSingle(),
		admin.from('no_lesson_periods').select('start_date, end_date'),
	]);
	return {
		option,
		dateOfBirth: studentResult.data?.date_of_birth ?? null,
		noLessonPeriods: noPeriodsResult.data ?? [],
	};
}

/** Pure DB lookup + math: returns the current billing computation for an agreement. */
async function computeBillingForAgreement(
	admin: SupabaseClient,
	lessonAgreementId: string,
): Promise<BillingComputation> {
	const agreement = await loadAgreementRow(admin, lessonAgreementId);
	const lookups = await loadBillingLookups(admin, agreement);
	return buildBillingComputationFromLoadedData({
		agreement,
		...lookups,
		today: new Date().toISOString().slice(0, 10),
	});
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

/** Create a Stripe Subscription Schedule with one phase per billing month. */
export async function createScheduleForAgreement(
	admin: SupabaseClient,
	stripe: Stripe,
	ctx: ScheduleContext,
): Promise<BuiltSchedule> {
	const billing = await computeBillingForAgreement(admin, ctx.lessonAgreementId);
	assertPositiveYearlyCents(billing.yearly.yearlyCents);

	const phases = buildPhases(
		billing.periodStart,
		billing.periodEnd,
		billing.yearly.monthlyCents,
		billing.yearly.leftoverCents,
	);
	assertHasBillingPhases(phases.length);

	const stripePhases = await toStripePhasePayloads(stripe, phases, ctx.lessonAgreementId, ctx.defaultPaymentMethod);
	const schedule = await stripe.subscriptionSchedules.create({
		customer: ctx.customerId,
		start_date: phases[0].startUnix,
		end_behavior: 'release',
		phases: stripePhases,
		metadata: {
			lesson_agreement_id: ctx.lessonAgreementId,
			school_year: `${billing.schoolYear.startYear}/${billing.schoolYear.startYear + 1}`,
		},
	});

	const subscriptionId = await persistCreatedSchedule(admin, ctx, schedule, phases, stripePhases);
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
	lessonAgreementId: string;
	scheduleId: string;
	schedule: Stripe.SubscriptionSchedule;
	billing: BillingComputation;
	newPhases: BillingPhase[];
	keptPayloads: Array<Record<string, unknown>>;
	firstFutureIndex: number;
}): Promise<RebuildResult | null> {
	const futurePayloads = alignFuturePhasePayloads(
		await toStripePhasePayloads(
			input.stripe,
			input.newPhases.slice(input.firstFutureIndex),
			input.lessonAgreementId,
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
			...(input.schedule.metadata ?? {}),
			lesson_agreement_id: input.lessonAgreementId,
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
	const billing = await computeBillingForAgreement(admin, lessonAgreementId);
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
		lessonAgreementId,
		scheduleId,
		schedule,
		billing,
		newPhases,
		keptPayloads,
		firstFutureIndex,
	});
	return updated ?? skippedRebuildResult(scheduleId, keptPayloads.length, billing);
}
