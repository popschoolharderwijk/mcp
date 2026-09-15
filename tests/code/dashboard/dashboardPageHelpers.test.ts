import { describe, expect, it } from 'bun:test';
import { NAV_ICONS, NAV_LABELS } from '../../../src/config/nav-labels';
import {
	fetchProfileFirstName,
	resolveStudentAgreementsCardView,
	studentDashboardPanelModel,
} from '../../../src/lib/dashboard/dashboardPageHelpers';
import type { StudentDashboardData } from '../../../src/lib/dashboard/studentDashboardHelpers';

describe('fetchProfileFirstName', () => {
	it('returns null when no profile row exists', async () => {
		expect(await fetchProfileFirstName(async () => null)).toBeNull();
	});

	it('returns null when first_name is empty', async () => {
		expect(await fetchProfileFirstName(async () => ({ first_name: null }))).toBeNull();
		expect(await fetchProfileFirstName(async () => ({ first_name: '' }))).toBeNull();
	});

	it('returns the loaded first name', async () => {
		expect(await fetchProfileFirstName(async () => ({ first_name: 'Ada' }))).toBe('Ada');
	});
});

describe('resolveStudentAgreementsCardView', () => {
	it('shows a skeleton while loading', () => {
		expect(resolveStudentAgreementsCardView(true, true)).toBe('skeleton');
	});

	it('shows a skeleton before dashboard data exists', () => {
		expect(resolveStudentAgreementsCardView(false, false)).toBe('skeleton');
	});

	it('shows the agreements card when data is ready', () => {
		expect(resolveStudentAgreementsCardView(false, true)).toBe('card');
	});
});

describe('studentDashboardPanelModel', () => {
	it('returns empty lists without dashboard data', () => {
		expect(studentDashboardPanelModel(null)).toEqual({ items: [], invoices: [], agreements: [] });
	});

	it('maps stats, invoices and agreements when data exists', () => {
		const studentDashboard: StudentDashboardData = {
			stats: {
				activeAgreements: 1,
				inactiveAgreements: 1,
				openInvoices: 2,
				trialCount: 1,
				trialStatus: 'scheduled',
			},
			agreements: [{ is_active: true }] as StudentDashboardData['agreements'],
			invoices: [
				{
					id: 'inv-1',
					invoice_number: 'F-1',
					issue_date: '2026-09-01',
					status: 'issued',
					amount_total_cents: 2500,
				},
			],
		};

		expect(studentDashboardPanelModel(studentDashboard)).toEqual({
			items: [
				{
					key: 'agreements',
					title: NAV_LABELS.agreements,
					value: 1,
					icon: NAV_ICONS.agreements,
					href: '/students/my-profile',
					description: '1 inactief',
				},
				{
					key: 'myInvoices',
					title: NAV_LABELS.myInvoices,
					value: 2,
					icon: NAV_ICONS.myInvoices,
					href: '/mijn-facturen',
				},
				{
					key: 'myTrial',
					title: NAV_LABELS.myTrial,
					value: 1,
					icon: NAV_ICONS.myTrial,
					href: '/my-trial',
					description: 'Ingepland',
				},
			],
			invoices: studentDashboard.invoices,
			agreements: studentDashboard.agreements,
		});
	});
});
