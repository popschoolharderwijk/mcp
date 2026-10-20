import { describe, expect, it } from 'bun:test';
import {
	STRIPE_NOT_CONFIGURED_MESSAGE,
	stripeNotConfiguredResponse,
	validateSyncCatalogBody,
} from '../../../supabase/functions/sync-stripe-catalog/validation';

describe('validateSyncCatalogBody', () => {
	it('accepts an empty body (full sync)', () => {
		expect(validateSyncCatalogBody({})).toBeNull();
	});
	it('accepts a lesson type id', () => {
		expect(validateSyncCatalogBody({ lesson_type_id: '11111111-1111-1111-1111-111111111111' })).toBeNull();
	});
	it('rejects an invalid lesson type id', () => {
		expect(validateSyncCatalogBody({ lesson_type_id: 'nope' })?.status).toBe(400);
	});
});

describe('stripeNotConfiguredResponse', () => {
	it('answers 200 with configured false instead of crashing', async () => {
		const response = stripeNotConfiguredResponse();
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			configured: false,
			message: STRIPE_NOT_CONFIGURED_MESSAGE,
			results: [],
		});
	});
});
