import { describe, expect, it } from 'bun:test';
import {
	buildSubscriptionActionBody,
	resolveSubscriptionActionError,
	resolveSubscriptionStatusBadge,
	shouldShowSubscriptionCard,
} from '@/lib/subscriptions/subscriptionCardHelpers';

describe('shouldShowSubscriptionCard', () => {
	it('shows only for saved Stripe agreements to privileged users', () => {
		expect(shouldShowSubscriptionCard(true, true, 'stripe')).toBe(true);
		expect(shouldShowSubscriptionCard(true, true, 'sepa')).toBe(false);
		expect(shouldShowSubscriptionCard(true, true, 'manual')).toBe(false);
		expect(shouldShowSubscriptionCard(false, true, 'stripe')).toBe(false);
		expect(shouldShowSubscriptionCard(true, false, 'stripe')).toBe(false);
	});
});

describe('buildSubscriptionActionBody', () => {
	it('opens the portal for the student with a return url', () => {
		expect(buildSubscriptionActionBody('open-portal', 'agr', 'stu', 'https://mcp.mplifi.nl/agreements/agr')).toEqual({
			user_id: 'stu',
			return_url: 'https://mcp.mplifi.nl/agreements/agr',
		});
	});

	it('sends the agreement id for other actions', () => {
		expect(buildSubscriptionActionBody('sync', 'agr', 'stu', 'x')).toEqual({ lesson_agreement_id: 'agr' });
	});
});

describe('resolveSubscriptionActionError', () => {
	it('prefers the server error message', () => {
		expect(resolveSubscriptionActionError('sync', { error: 'Kapot' }, null)).toBe('Kapot');
	});

	it('returns null on success', () => {
		expect(resolveSubscriptionActionError('sync', { synced: true }, null)).toBeNull();
	});
});

describe('resolveSubscriptionStatusBadge', () => {
	it('maps known statuses and ignores unknown ones', () => {
		expect(resolveSubscriptionStatusBadge('active')?.label).toBe('Actief');
		expect(resolveSubscriptionStatusBadge('weird')).toBeNull();
		expect(resolveSubscriptionStatusBadge(null)).toBeNull();
	});
});
