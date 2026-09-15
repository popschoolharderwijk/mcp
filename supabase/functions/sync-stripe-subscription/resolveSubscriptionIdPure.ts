import type { SupabaseClient } from '@supabase/supabase-js';
import { jsonResponse } from '../_shared/http.ts';
import type { SubscriptionRow } from './types.ts';

export interface ResolvedSubscription {
	stripeSubscriptionId: string;
	scheduleIdFromDb: string | null;
	lessonAgreementIdHint: string | null;
}

export interface StripeScheduleLike {
	released_subscription?: unknown;
	subscription?: string | null;
	status: string;
}

export interface StripeScheduleClient {
	subscriptionSchedules: {
		retrieve(scheduleId: string): Promise<StripeScheduleLike>;
	};
}

export function resolveDirectStripeSubscription(args: {
	stripeSubscriptionId?: string;
	lessonAgreementId?: string;
}): { ok: true; resolved: ResolvedSubscription } | null {
	if (!args.stripeSubscriptionId) return null;
	return {
		ok: true,
		resolved: {
			stripeSubscriptionId: args.stripeSubscriptionId,
			scheduleIdFromDb: null,
			lessonAgreementIdHint: args.lessonAgreementId ?? null,
		},
	};
}

export function extractReleasedSubscriptionId(schedule: StripeScheduleLike): string | null {
	if (typeof schedule.released_subscription === 'string') {
		return schedule.released_subscription;
	}
	return schedule.subscription ?? null;
}

export function buildPendingScheduleSyncInfo(status: string): {
	synced: false;
	info: string;
	schedule_status: string;
} {
	return {
		synced: false,
		info: `Schedule status is ${status}; nog geen actief abonnement gekoppeld.`,
		schedule_status: status,
	};
}

export function buildResolvedSubscriptionFromRow(
	row: { stripe_subscription_id: string | null; stripe_schedule_id: string | null },
	lessonAgreementId: string,
	stripeSubscriptionId: string,
): ResolvedSubscription {
	return {
		stripeSubscriptionId,
		scheduleIdFromDb: row.stripe_schedule_id,
		lessonAgreementIdHint: lessonAgreementId,
	};
}

function missingSubscriptionResponse(): { ok: false; response: Response } {
	return {
		ok: false,
		response: jsonResponse(400, { error: 'Geen Stripe-abonnement gevonden om te syncen' }),
	};
}

async function lookupSubscriptionRow(admin: SupabaseClient, lessonAgreementId: string): Promise<SubscriptionRow> {
	const { data: row, error: rowErr } = await admin
		.from('subscriptions')
		.select('stripe_subscription_id, stripe_schedule_id')
		.eq('lesson_agreement_id', lessonAgreementId)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();
	if (rowErr) throw rowErr;
	return row ?? { stripe_subscription_id: null, stripe_schedule_id: null };
}

async function resolveFromSchedule(
	stripe: StripeScheduleClient,
	scheduleId: string,
): Promise<{ kind: 'resolved'; stripeSubscriptionId: string } | { kind: 'pending'; response: Response }> {
	const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
	const released = extractReleasedSubscriptionId(schedule);
	if (released) {
		return { kind: 'resolved', stripeSubscriptionId: released };
	}
	return {
		kind: 'pending',
		response: jsonResponse(200, buildPendingScheduleSyncInfo(schedule.status)),
	};
}

async function resolveFromLessonAgreement(
	admin: SupabaseClient,
	stripe: StripeScheduleClient,
	lessonAgreementId: string,
): Promise<{ ok: true; resolved: ResolvedSubscription } | { ok: false; response: Response }> {
	const row = await lookupSubscriptionRow(admin, lessonAgreementId);
	let stripeSubscriptionId = row.stripe_subscription_id;
	const scheduleIdFromDb = row.stripe_schedule_id;

	if (!stripeSubscriptionId && scheduleIdFromDb) {
		const scheduleResult = await resolveFromSchedule(stripe, scheduleIdFromDb);
		if (scheduleResult.kind === 'pending') return { ok: false, response: scheduleResult.response };
		stripeSubscriptionId = scheduleResult.stripeSubscriptionId;
	}

	if (!stripeSubscriptionId) return missingSubscriptionResponse();

	return {
		ok: true,
		resolved: buildResolvedSubscriptionFromRow(row, lessonAgreementId, stripeSubscriptionId),
	};
}

export async function resolveStripeSubscriptionId(
	admin: SupabaseClient,
	stripe: StripeScheduleClient,
	args: {
		stripeSubscriptionId?: string;
		lessonAgreementId?: string;
	},
): Promise<{ ok: true; resolved: ResolvedSubscription } | { ok: false; response: Response }> {
	const direct = resolveDirectStripeSubscription(args);
	if (direct) return direct;

	if (!args.lessonAgreementId) {
		return missingSubscriptionResponse();
	}

	return resolveFromLessonAgreement(admin, stripe, args.lessonAgreementId);
}
