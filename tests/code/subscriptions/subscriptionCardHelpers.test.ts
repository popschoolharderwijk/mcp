import { describe, expect, it } from 'bun:test';
import {
	buildSubscriptionActionBody,
	extractPortalUrl,
	isPortalActionDisabled,
	isRebuildActionDisabled,
	resolveSubscriptionActionError,
	resolveSubscriptionActionOutcome,
	resolveSubscriptionActionSuccess,
	resolveSubscriptionStatusBadge,
	SUBSCRIPTION_ACTION_FUNCTIONS,
	shouldShowResendAction,
	shouldShowResendInvitation,
	shouldShowSubscriptionCard,
	subscriptionInviteSentDay,
	subscriptionPeriodEndDay,
} from '../../../src/lib/subscriptions/subscriptionCardHelpers';

describe('subscriptionCardHelpers', () => {
	it('maps send-invite to issue-payment-link with send:true', () => {
		expect(SUBSCRIPTION_ACTION_FUNCTIONS['send-invite']).toBe('issue-payment-link');
		expect(buildSubscriptionActionBody('send-invite', 'agr-1', 'stu-1', 'https://app')).toEqual({
			lesson_agreement_id: 'agr-1',
			send: true,
		});
	});

	it('builds portal body with user_id and return_url', () => {
		expect(buildSubscriptionActionBody('open-portal', 'agr-1', 'stu-1', 'https://app')).toEqual({
			user_id: 'stu-1',
			return_url: 'https://app',
		});
	});

	it('shows resend only when no schedule or subscription exists', () => {
		expect(shouldShowResendInvitation(null)).toBe(true);
		expect(shouldShowResendInvitation({ stripe_schedule_id: 'sched', stripe_subscription_id: null })).toBe(false);
	});

	it('hides resend while loading and disables portal/rebuild without schedule', () => {
		expect(shouldShowResendAction(true, null)).toBe(false);
		expect(shouldShowResendAction(false, null)).toBe(true);
		expect(isPortalActionDisabled(false, null)).toBe(true);
		expect(isPortalActionDisabled(true, { stripe_schedule_id: 's' })).toBe(true);
		expect(isRebuildActionDisabled(false, { stripe_schedule_id: null })).toBe(true);
		expect(isRebuildActionDisabled(false, { stripe_schedule_id: 'sched' })).toBe(false);
	});

	it('derives period and invite day labels for the status block', () => {
		expect(subscriptionPeriodEndDay(null)).toBeNull();
		expect(subscriptionPeriodEndDay({ current_period_end: '2026-11-15T12:00:00Z' })).toBe('2026-11-15');
		expect(subscriptionInviteSentDay('2026-10-01T09:00:00Z', true)).toBeNull();
		expect(subscriptionInviteSentDay('2026-10-01T09:00:00Z', false)).toBe('2026-10-01');
		expect(subscriptionInviteSentDay(null, false)).toBeNull();
	});

	it('prefers server error payload over fallback', () => {
		expect(resolveSubscriptionActionError('sync', { error: 'Geen rechten' }, null)).toBe('Geen rechten');
		expect(resolveSubscriptionActionError('sync', {}, { message: 'network' })).toBe(
			'Kon niet synchroniseren met Stripe',
		);
	});

	it('formats success messages for invite and rebuild', () => {
		expect(resolveSubscriptionActionSuccess('send-invite', { recipient: 'a@b.nl' })).toBe(
			'Betaaluitnodiging verstuurd naar a@b.nl',
		);
		expect(resolveSubscriptionActionSuccess('rebuild', { results: [{ detail: { updatedPhases: 3 } }] })).toBe(
			'Nieuwe tarieven toegepast op 3 toekomstige maand(en)',
		);
	});

	it('extracts portal url and status badge', () => {
		expect(extractPortalUrl({ url: 'https://billing.stripe.com/x' })).toBe('https://billing.stripe.com/x');
		expect(resolveSubscriptionStatusBadge('active')).toEqual({ label: 'Actief', variant: 'default' });
		expect(resolveSubscriptionStatusBadge('unknown')).toBeNull();
	});

	it('shows subscription card only for privileged edit mode', () => {
		expect(shouldShowSubscriptionCard(true, true)).toBe(true);
		expect(shouldShowSubscriptionCard(true, false)).toBe(false);
		expect(shouldShowSubscriptionCard(false, true)).toBe(false);
	});

	it('resolves action outcomes for error, portal, and success', () => {
		expect(resolveSubscriptionActionOutcome('sync', { error: 'x' }, null)).toEqual({
			kind: 'error',
			message: 'x',
		});
		expect(resolveSubscriptionActionOutcome('open-portal', { url: 'https://p' }, null)).toEqual({
			kind: 'portal',
			url: 'https://p',
		});
		expect(resolveSubscriptionActionOutcome('force-start', {}, null)).toEqual({
			kind: 'success',
			message: 'Abonnement direct gestart in Stripe',
		});
	});
});
