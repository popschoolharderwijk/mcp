import { describe, expect, it } from 'bun:test';
import {
	buildIssuePaymentLinkBody,
	buildStaffCheckoutBody,
	buildSubscriptionActionBody,
	decideStaffCheckoutOpen,
	extractPortalUrl,
	isPortalActionDisabled,
	isRebuildActionDisabled,
	resolveCheckoutSessionUrl,
	resolveIssuedPaymentUrl,
	resolveIssuePaymentLinkSendError,
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
	it('maps send-invite to issue-payment-link body', () => {
		expect(SUBSCRIPTION_ACTION_FUNCTIONS['send-invite']).toBe('issue-payment-link');
		expect(buildSubscriptionActionBody('send-invite', 'agr-1', 'stu-1', 'https://app')).toEqual({
			lesson_agreement_id: 'agr-1',
		});
		expect(buildIssuePaymentLinkBody('agr-1')).toEqual({
			lesson_agreement_id: 'agr-1',
		});
		expect(buildIssuePaymentLinkBody('agr-1', '  test@ex.com ')).toEqual({
			lesson_agreement_id: 'agr-1',
			recipient_email: 'test@ex.com',
		});
		expect(resolveIssuedPaymentUrl({ payment_url: 'http://127.0.0.1:8081/pay?t=abc' })).toBe(
			'http://127.0.0.1:8081/pay?t=abc',
		);
		expect(resolveIssuedPaymentUrl({})).toBeNull();
		expect(buildStaffCheckoutBody('agr-1')).toEqual({
			lesson_agreement_id: 'agr-1',
			mode: 'checkout',
		});
		expect(resolveCheckoutSessionUrl({ url: 'https://checkout.stripe.com/c/pay/cs_test' })).toBe(
			'https://checkout.stripe.com/c/pay/cs_test',
		);
		expect(resolveCheckoutSessionUrl({ mode: 'complete' })).toBeNull();
		expect(decideStaffCheckoutOpen({ error: 'Geen toegang' }, false)).toEqual({
			kind: 'data_error',
			message: 'Geen toegang',
		});
		expect(decideStaffCheckoutOpen({ url: 'https://checkout.stripe.com/c/pay/cs_test' }, true)).toEqual({
			kind: 'invoke_error',
		});
		expect(decideStaffCheckoutOpen({}, false)).toEqual({ kind: 'missing_url' });
		expect(decideStaffCheckoutOpen({ url: 'https://checkout.stripe.com/c/pay/cs_ok' }, false)).toEqual({
			kind: 'ok',
			url: 'https://checkout.stripe.com/c/pay/cs_ok',
		});
	});

	it('builds portal body with user_id and return_url', () => {
		expect(buildSubscriptionActionBody('open-portal', 'agr-1', 'stu-1', 'https://app')).toEqual({
			user_id: 'stu-1',
			return_url: 'https://app',
		});
	});

	it('shows resend when no live schedule, including canceled subscriptions', () => {
		expect(shouldShowResendInvitation(null)).toBe(true);
		expect(shouldShowResendInvitation({ stripe_schedule_id: 'sched', stripe_subscription_id: null })).toBe(false);
		expect(
			shouldShowResendInvitation({
				status: 'canceled',
				stripe_schedule_id: null,
				stripe_subscription_id: 'sub_old',
			}),
		).toBe(true);
		expect(
			shouldShowResendInvitation({
				status: 'canceled',
				stripe_schedule_id: 'sched',
				stripe_subscription_id: 'sub_old',
			}),
		).toBe(false);
		expect(
			shouldShowResendInvitation({
				status: 'active',
				stripe_schedule_id: null,
				stripe_subscription_id: 'sub_1',
			}),
		).toBe(false);
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

	it('treats missing sent flag as invite send failure', async () => {
		expect(await resolveIssuePaymentLinkSendError({ recipient: 'a@b.nl', sent: true }, null)).toBeNull();
		expect(await resolveIssuePaymentLinkSendError({ recipient: 'a@b.nl', sent: false }, null)).toBe(
			'Kon de betaaluitnodiging niet versturen',
		);
		expect(await resolveIssuePaymentLinkSendError({ recipient: 'a@b.nl' }, null)).toBe(
			'Kon de betaaluitnodiging niet versturen',
		);
		expect(await resolveIssuePaymentLinkSendError({ error: 'Mail-verzending mislukt' }, null)).toBe(
			'Mail-verzending mislukt',
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

	it('resolves action outcomes for error, portal, and success', async () => {
		expect(await resolveSubscriptionActionOutcome('sync', { error: 'x' }, null)).toEqual({
			kind: 'error',
			message: 'x',
		});
		expect(await resolveSubscriptionActionOutcome('open-portal', { url: 'https://p' }, null)).toEqual({
			kind: 'portal',
			url: 'https://p',
		});
		expect(await resolveSubscriptionActionOutcome('send-invite', { recipient: 'a@b.nl' }, null)).toEqual({
			kind: 'error',
			message: 'Kon de betaaluitnodiging niet versturen',
		});
		expect(
			await resolveSubscriptionActionOutcome('send-invite', { recipient: 'a@b.nl', sent: true }, null),
		).toEqual({
			kind: 'success',
			message: 'Betaaluitnodiging verstuurd naar a@b.nl',
		});
	});
});
