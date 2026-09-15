import { describe, expect, it } from 'bun:test';
import type { LessonAgreement } from '../../../src/components/students/LessonAgreementItem';
import { NAV_ICONS, NAV_LABELS } from '../../../src/config/nav-labels';
import {
	buildStudentDashboardStatItems,
	mapStudentDashboardQueryResults,
	type StudentDashboardInvoice,
} from '../../../src/lib/dashboard/studentDashboardHelpers';

const activeAgreement = { is_active: true } as LessonAgreement;
const inactiveAgreement = { is_active: false } as LessonAgreement;

const invoice: StudentDashboardInvoice = {
	id: 'inv-1',
	invoice_number: 'F-1',
	issue_date: '2026-09-01',
	status: 'issued',
	amount_total_cents: 2500,
};

describe('mapStudentDashboardQueryResults', () => {
	it('counts active agreements and keeps list rows', () => {
		expect(
			mapStudentDashboardQueryResults({
				agreements: [activeAgreement, inactiveAgreement, activeAgreement],
				openInvoicesCount: 1,
				invoiceRows: [invoice],
				latestTrial: { status: 'scheduled' },
			}),
		).toEqual({
			stats: {
				activeAgreements: 2,
				inactiveAgreements: 1,
				openInvoices: 1,
				trialCount: 1,
				trialStatus: 'scheduled',
			},
			agreements: [activeAgreement, inactiveAgreement, activeAgreement],
			invoices: [invoice],
		});
	});

	it('counts an open completed trial', () => {
		expect(
			mapStudentDashboardQueryResults({
				agreements: [],
				openInvoicesCount: 0,
				invoiceRows: [],
				latestTrial: { status: 'completed' },
			}).stats.trialCount,
		).toBe(1);
	});

	it('counts zero trials without a trial row', () => {
		expect(
			mapStudentDashboardQueryResults({
				agreements: [],
				openInvoicesCount: 0,
				invoiceRows: [],
				latestTrial: null,
			}).stats.trialCount,
		).toBe(0);
	});

	it('counts zero trials for closed statuses', () => {
		expect(
			mapStudentDashboardQueryResults({
				agreements: [],
				openInvoicesCount: 0,
				invoiceRows: [],
				latestTrial: { status: 'converted' },
			}).stats.trialCount,
		).toBe(0);
		expect(
			mapStudentDashboardQueryResults({
				agreements: [],
				openInvoicesCount: 0,
				invoiceRows: [],
				latestTrial: { status: 'cancelled' },
			}).stats.trialCount,
		).toBe(0);
		expect(
			mapStudentDashboardQueryResults({
				agreements: [],
				openInvoicesCount: 0,
				invoiceRows: [],
				latestTrial: { status: 'student_confirmed' },
			}).stats.trialCount,
		).toBe(0);
		expect(
			mapStudentDashboardQueryResults({
				agreements: [],
				openInvoicesCount: 0,
				invoiceRows: [],
				latestTrial: { status: 'student_declined' },
			}).stats.trialCount,
		).toBe(0);
	});

	it('caps agreement and invoice lists at five rows', () => {
		const agreements = Array.from({ length: 6 }, (_, index) => ({
			is_active: index < 4,
		})) as LessonAgreement[];
		const invoices = Array.from({ length: 6 }, (_, index) => ({
			...invoice,
			id: `inv-${index}`,
		}));

		const result = mapStudentDashboardQueryResults({
			agreements,
			openInvoicesCount: 6,
			invoiceRows: invoices,
			latestTrial: null,
		});

		expect(result.agreements).toHaveLength(5);
		expect(result.invoices).toHaveLength(5);
		expect(result.agreements).toEqual(agreements.slice(0, 5));
		expect(result.invoices).toEqual(invoices.slice(0, 5));
		expect(result.stats.activeAgreements).toBe(4);
		expect(result.stats.inactiveAgreements).toBe(2);
	});

	it('treats missing invoice rows, counts and trials as empty', () => {
		expect(
			mapStudentDashboardQueryResults({
				agreements: [],
				openInvoicesCount: null,
				invoiceRows: null,
				latestTrial: null,
			}),
		).toEqual({
			stats: {
				activeAgreements: 0,
				inactiveAgreements: 0,
				openInvoices: 0,
				trialCount: 0,
				trialStatus: null,
			},
			agreements: [],
			invoices: [],
		});
	});
});

describe('buildStudentDashboardStatItems', () => {
	it('uses student destinations and nav labels', () => {
		expect(
			buildStudentDashboardStatItems({
				activeAgreements: 1,
				inactiveAgreements: 1,
				openInvoices: 2,
				trialCount: 1,
				trialStatus: 'scheduled',
			}),
		).toEqual([
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
		]);
	});
});
