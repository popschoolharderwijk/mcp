import { describe, expect, it } from 'bun:test';
import {
	buildMandatesTabItems,
	countAwaitingMandatesFromTabs,
	fetchMandateRowsKeepingUnchanged,
	formatMandatesReconcileToast,
	keepIfUnchanged,
	mandateOverviewLoadErrorMessage,
	parseMandatesReconcileSummary,
	parseMandatesTab,
	resolveAwaitingMandatesNoticeTab,
	resolveMandatesAccess,
	resolveMandatesTabRedirect,
	sameMandatesTabCounts,
} from '../../../src/lib/subscriptions/mandatesTabsHelpers';

describe('mandatesTabsHelpers', () => {
	it('defaults unknown tabs to active and redirects only when the URL must change', () => {
		expect(parseMandatesTab(undefined)).toBe('active');
		expect(parseMandatesTab('arranged')).toBe('active');
		expect(parseMandatesTab('canceled')).toBe('canceled');
		expect(resolveMandatesTabRedirect('canceled')).toBeNull();
		expect(resolveMandatesTabRedirect(undefined)).toBe('/mandates/active');
		expect(resolveMandatesTabRedirect('inactive')).toBe('/mandates/active');
		expect(resolveMandatesTabRedirect('arranged')).toBe('/mandates/active');
	});

	it('appends counts to tab labels in Actief → Geannuleerd → In afwachting → Niet verstuurd order', () => {
		expect(buildMandatesTabItems(null).map((item) => item.label)).toEqual([
			'Actief',
			'Geannuleerd',
			'In afwachting',
			'Niet verstuurd',
		]);
		expect(
			buildMandatesTabItems({
				active: 3,
				canceled: 1,
				pending: 2,
				unsent: 0,
			}).map((item) => item.label),
		).toEqual(['Actief (3)', 'Geannuleerd (1)', 'In afwachting (2)', 'Niet verstuurd (0)']);
	});

	it('resolves access with auth, forbidden, and redirect taking priority over ok', () => {
		expect(resolveMandatesAccess(true, true, null)).toEqual({ kind: 'auth-loading' });
		expect(resolveMandatesAccess(false, false, null)).toEqual({ kind: 'forbidden' });
		expect(resolveMandatesAccess(false, true, '/mandates/active')).toEqual({
			kind: 'redirect',
			to: '/mandates/active',
		});
		expect(resolveMandatesAccess(false, true, null)).toEqual({ kind: 'ok' });
	});

	it('parses reconcile summary payloads and formats toast copy', () => {
		expect(
			parseMandatesReconcileSummary({
				configured: true,
				checked: 4,
				synced: 2,
				canceled: 1,
				skipped: 1,
				failed: 0,
			}),
		).toEqual({
			configured: true,
			checked: 4,
			synced: 2,
			canceled: 1,
			skipped: 1,
			failed: 0,
		});
		expect(parseMandatesReconcileSummary({ error: 'Kon niet syncen' })).toEqual({
			checked: 0,
			synced: 0,
			canceled: 0,
			skipped: 0,
			failed: 0,
			error: 'Kon niet syncen',
		});
		expect(parseMandatesReconcileSummary(null)).toBeNull();
		expect(parseMandatesReconcileSummary({ checked: 1 })).toBeNull();
		expect(
			formatMandatesReconcileToast({
				configured: false,
				checked: 0,
				synced: 0,
				canceled: 0,
				skipped: 0,
				failed: 0,
			}),
		).toBe('Stripe is niet geconfigureerd.');
		expect(formatMandatesReconcileToast({ checked: 0, synced: 0, canceled: 0, skipped: 0, failed: 0 })).toBe(
			'Geen machtigingen om te synchroniseren.',
		);
		expect(
			formatMandatesReconcileToast({
				configured: true,
				checked: 5,
				synced: 2,
				canceled: 1,
				skipped: 1,
				failed: 1,
			}),
		).toBe('5 gecontroleerd, 2 bijgewerkt, 1 geannuleerd, 1 overgeslagen, 1 mislukt');
	});

	it('keeps the previous reference when poll payloads are unchanged', () => {
		const counts = { active: 1, canceled: 0, pending: 2, unsent: 3 };
		expect(keepIfUnchanged(counts, { active: 1, canceled: 0, pending: 2, unsent: 3 })).toBe(counts);
		expect(keepIfUnchanged(counts, { active: 2, canceled: 0, pending: 2, unsent: 3 })).not.toBe(counts);
		expect(sameMandatesTabCounts(counts, { active: 1, canceled: 0, pending: 2, unsent: 3 })).toBe(true);
		expect(sameMandatesTabCounts(counts, { active: 9, canceled: 0, pending: 2, unsent: 3 })).toBe(false);
		expect(sameMandatesTabCounts(null, null)).toBe(true);
	});

	it('applies fetched mandate rows with keepIfUnchanged and maps load errors', async () => {
		expect(mandateOverviewLoadErrorMessage(new Error('timeout'))).toBe('timeout');
		expect(mandateOverviewLoadErrorMessage('x')).toBe('Kon het overzicht niet laden');

		const previous = [{ id: 'a' }];
		let stored = previous;
		const setRows = (update: typeof previous | ((p: typeof previous) => typeof previous)) => {
			stored = typeof update === 'function' ? update(stored) : update;
		};

		const ok = await fetchMandateRowsKeepingUnchanged(async () => [{ id: 'a' }], setRows);
		expect(ok).toEqual({ ok: true });
		expect(stored).toBe(previous);

		const changed = await fetchMandateRowsKeepingUnchanged(async () => [{ id: 'b' }], setRows);
		expect(changed).toEqual({ ok: true });
		expect(stored).toEqual([{ id: 'b' }]);

		const boom = new Error('db down');
		const failed = await fetchMandateRowsKeepingUnchanged(async () => {
			throw boom;
		}, setRows);
		expect(failed).toEqual({ ok: false, error: boom });
		expect(stored).toEqual([{ id: 'b' }]);
	});

	it('routes the dashboard awaiting notice to the tab that owns the count', () => {
		expect(resolveAwaitingMandatesNoticeTab({ pending: 0, unsent: 2 })).toBe('unsent');
		expect(resolveAwaitingMandatesNoticeTab({ pending: 3, unsent: 0 })).toBe('pending');
		expect(resolveAwaitingMandatesNoticeTab({ pending: 2, unsent: 1 })).toBe('pending');
		expect(countAwaitingMandatesFromTabs({ pending: 2, unsent: 1 })).toBe(3);
	});
});
