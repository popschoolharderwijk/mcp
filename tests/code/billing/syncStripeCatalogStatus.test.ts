import { describe, expect, it } from 'bun:test';
import { summarizeStripeCatalogSync } from '../../../src/lib/billing/syncStripeCatalog';

describe('summarizeStripeCatalogSync', () => {
	it('reports not configured as info', () => {
		expect(summarizeStripeCatalogSync({ configured: false, message: 'Stripe is nog niet ingesteld' })).toEqual({
			kind: 'info',
			message: 'Stripe is nog niet ingesteld',
		});
	});

	it('reports errors from summary', () => {
		expect(
			summarizeStripeCatalogSync({
				configured: true,
				summary: { synced: 1, skipped: 0, errors: 2, changed: 1 },
			}),
		).toEqual({
			kind: 'error',
			message: '2 lesoptie(s) konden niet met Stripe worden gesynchroniseerd',
		});
	});

	it('reports up-to-date and changed successes', () => {
		expect(
			summarizeStripeCatalogSync({
				configured: true,
				summary: { synced: 3, skipped: 0, errors: 0, changed: 0 },
			}),
		).toEqual({ kind: 'info', message: 'Stripe-catalogus is al up-to-date' });
		expect(
			summarizeStripeCatalogSync({
				configured: true,
				summary: { synced: 3, skipped: 0, errors: 0, changed: 2 },
			}),
		).toEqual({ kind: 'success', message: '2 lesoptie(s) gesynchroniseerd met Stripe' });
	});
});
