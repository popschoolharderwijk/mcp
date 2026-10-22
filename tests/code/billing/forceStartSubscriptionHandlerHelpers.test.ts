import { describe, expect, it } from 'bun:test';
import {
	buildForceStartSuccessPayload,
	resolveForceStartAgreementGate,
	resolveForceStartAgreementNotFound,
	resolveForceStartBillingErrors,
	resolveForceStartMissingSchedule,
	resolveForceStartScheduleStatusError,
} from '../../../supabase/functions/_shared/forceStartSubscriptionHandlerHelpers';

describe('resolveForceStartAgreementNotFound', () => {
	it('returns not found when agreement is missing', () => {
		expect(resolveForceStartAgreementNotFound(null, 'db error')).toEqual({
			status: 404,
			error: 'Lesovereenkomst niet gevonden',
		});
	});

	it('returns null when agreement exists', () => {
		expect(
			resolveForceStartAgreementNotFound({ id: 'agr-1', stripe_schedule_id: 'sched_1' }, undefined),
		).toBeNull();
	});
});

describe('resolveForceStartMissingSchedule', () => {
	it('returns error when schedule id is missing', () => {
		expect(resolveForceStartMissingSchedule({ stripe_schedule_id: null })).toEqual({
			status: 400,
			error: 'Geen Stripe schedule gekoppeld aan deze lesovereenkomst',
		});
	});

	it('returns null when schedule id exists', () => {
		expect(resolveForceStartMissingSchedule({ stripe_schedule_id: 'sched_1' })).toBeNull();
	});
});

describe('resolveForceStartScheduleStatusError', () => {
	it('returns null for allowed statuses', () => {
		expect(resolveForceStartScheduleStatusError('not_started')).toBeNull();
		expect(resolveForceStartScheduleStatusError('active')).toBeNull();
	});

	it('returns error for blocked statuses', () => {
		expect(resolveForceStartScheduleStatusError('canceled')).toEqual({
			status: 400,
			error: 'Schedule status is canceled; kan niet geforceerd starten',
		});
	});
});

describe('resolveForceStartBillingErrors', () => {
	it('returns null when billing details are complete', () => {
		expect(resolveForceStartBillingErrors({ customerId: 'cus_1', priceId: 'price_1' })).toBeNull();
	});

	it('returns customer error when customer id is missing', () => {
		expect(resolveForceStartBillingErrors({ customerId: null, priceId: 'price_1' })).toEqual({
			status: 400,
			error: 'Kon Stripe customer niet bepalen',
		});
	});

	it('returns price error when price id is missing', () => {
		expect(resolveForceStartBillingErrors({ customerId: 'cus_1', priceId: null })).toEqual({
			status: 400,
			error: 'Kon prijs uit schedule niet lezen',
		});
	});
});

describe('resolveForceStartAgreementGate', () => {
	it('returns agreement not found when agreement is missing', () => {
		expect(resolveForceStartAgreementGate(null, 'db error')).toEqual({
			status: 404,
			error: 'Lesovereenkomst niet gevonden',
		});
	});

	it('returns missing schedule error when schedule id is absent', () => {
		expect(resolveForceStartAgreementGate({ id: 'agr-1', stripe_schedule_id: null }, undefined)).toEqual({
			status: 400,
			error: 'Geen Stripe schedule gekoppeld aan deze lesovereenkomst',
		});
	});

	it('returns null when agreement and schedule are valid', () => {
		expect(resolveForceStartAgreementGate({ id: 'agr-1', stripe_schedule_id: 'sched_1' }, undefined)).toBeNull();
	});
});

describe('buildForceStartSuccessPayload', () => {
	it('builds force start success payload', () => {
		expect(buildForceStartSuccessPayload({ id: 'sub_1', status: 'active' })).toEqual({
			ok: true,
			stripe_subscription_id: 'sub_1',
			status: 'active',
		});
	});
});
