import { describe, expect, it } from 'bun:test';
import { resolveStripeCatalogStatus, summarizeStripeCatalogSync } from '@/lib/billing/stripeCatalogStatus';

const row = { stripe_product_id: 'prod_1', is_active_in_stripe: true, sync_status: 'in_sync' };

describe('resolveStripeCatalogStatus', () => {
	it('in sync', () => {
		expect(resolveStripeCatalogStatus({ hasTariff: true, lessonTypeActive: true, row })).toBe('in_sync');
	});
	it('no tariff means no product', () => {
		expect(resolveStripeCatalogStatus({ hasTariff: false, lessonTypeActive: true, row: null })).toBe('no_tariff');
	});
	it('missing when never synced', () => {
		expect(resolveStripeCatalogStatus({ hasTariff: true, lessonTypeActive: true, row: null })).toBe('missing');
	});
	it('pending and error win', () => {
		expect(resolveStripeCatalogStatus({ hasTariff: true, lessonTypeActive: true, row: { ...row, sync_status: 'pending' } })).toBe('pending');
		expect(resolveStripeCatalogStatus({ hasTariff: true, lessonTypeActive: true, row: { ...row, sync_status: 'error' } })).toBe('error');
	});
	it('archived when lesson type inactive', () => {
		expect(resolveStripeCatalogStatus({ hasTariff: true, lessonTypeActive: false, row })).toBe('archived');
	});
});

describe('summarizeStripeCatalogSync', () => {
	it('not configured is informational', () => {
		expect(summarizeStripeCatalogSync({ configured: false, message: 'x', results: [] }).kind).toBe('info');
	});
	it('reports errors', () => {
		expect(summarizeStripeCatalogSync({ configured: true, results: [{ status: 'error' }] }).kind).toBe('error');
	});
});
