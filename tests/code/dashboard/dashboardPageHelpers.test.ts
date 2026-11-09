import { describe, expect, it } from 'bun:test';
import { NAV_LABELS } from '../../../src/config/nav-items';
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
		expect(studentDashboardPanelModel(null)).toEqual({ items: [], agreements: [] });
	});

	it('maps stats and agreements when data exists', () => {
		const studentDashboard: StudentDashboardData = {
			stats: {
				activeAgreements: 1,
				inactiveAgreements: 1,
				trialCount: 1,
				trialStatus: 'scheduled',
			},
			agreements: [{ is_active: true }] as StudentDashboardData['agreements'],
		};

		expect(studentDashboardPanelModel(studentDashboard)).toEqual({
			items: [
				{
					key: 'agreements',
					title: NAV_LABELS.agreements,
					value: 1,
					href: '/students/my-profile',
					description: '1 inactief',
				},
				{
					key: 'myTrial',
					title: NAV_LABELS.myTrial,
					value: 1,
					href: '/my-trial',
					description: 'Ingepland',
				},
			],
			agreements: studentDashboard.agreements,
		});
	});
});
