import { describe, expect, it } from 'bun:test';
import { assertDashboardQueriesOk, DashboardLoadError } from '../../../src/lib/dashboard/dashboardLoadErrorPure';

describe('assertDashboardQueriesOk', () => {
	it('does nothing when all queries succeeded', () => {
		expect(() =>
			assertDashboardQueriesOk([
				{ label: 'students', error: null },
				{ label: 'teachers', error: null },
			]),
		).not.toThrow();
	});

	it('throws a DashboardLoadError with the failing query label', () => {
		expect(() =>
			assertDashboardQueriesOk([
				{ label: 'students', error: null },
				{ label: 'invoices', error: { message: 'permission denied' } },
			]),
		).toThrow(new DashboardLoadError('invoices: permission denied'));
	});
});
