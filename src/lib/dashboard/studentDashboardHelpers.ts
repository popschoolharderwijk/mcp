import type { LessonAgreement } from '@/components/students/LessonAgreementItem';
import { NAV_ICONS, NAV_LABELS } from '@/config/nav-labels';
import type { Enums } from '@/integrations/supabase/types';
import { type DashboardStatItem, inactiveCountDescription } from '@/lib/dashboard/dashboardStatsGridHelpers';
import type { InvoiceStatus } from '@/lib/invoices/types';
import { getTrialStatusLabel } from '@/lib/trial-lessons/statusLabels';

type TrialLessonStatus = Enums<'trial_lesson_status'>;

export const STUDENT_DASHBOARD_STAT_COUNT = 3;
const DASHBOARD_LIST_LIMIT = 5;

export interface StudentDashboardInvoice {
	id: string;
	invoice_number: string;
	issue_date: string;
	status: InvoiceStatus;
	amount_total_cents: number;
}

export interface StudentDashboardStats {
	activeAgreements: number;
	inactiveAgreements: number;
	openInvoices: number;
	trialCount: number;
	trialStatus: TrialLessonStatus | null;
}

export interface StudentDashboardData {
	stats: StudentDashboardStats;
	agreements: LessonAgreement[];
	invoices: StudentDashboardInvoice[];
}

function isOpenStudentTrialStatus(status: TrialLessonStatus): boolean {
	return status === 'scheduled' || status === 'completed';
}

function countActiveAgreements(agreements: { is_active: boolean }[]): number {
	return agreements.filter((agreement) => agreement.is_active).length;
}

function resolveStudentTrialCount(status: TrialLessonStatus | null): number {
	if (!status) return 0;
	if (!isOpenStudentTrialStatus(status)) return 0;
	return 1;
}

function trialStatusDescription(status: TrialLessonStatus | null): string | undefined {
	if (!status) return undefined;
	return getTrialStatusLabel(status, 'student');
}

function assembleStudentDashboardData(params: {
	agreements: LessonAgreement[];
	invoices: StudentDashboardInvoice[];
	openInvoiceCount: number;
	latestTrialStatus: TrialLessonStatus | null;
}): StudentDashboardData {
	const activeAgreements = countActiveAgreements(params.agreements);
	return {
		stats: {
			activeAgreements,
			inactiveAgreements: params.agreements.length - activeAgreements,
			openInvoices: params.openInvoiceCount,
			trialCount: resolveStudentTrialCount(params.latestTrialStatus),
			trialStatus: params.latestTrialStatus,
		},
		agreements: params.agreements.slice(0, DASHBOARD_LIST_LIMIT),
		invoices: params.invoices.slice(0, DASHBOARD_LIST_LIMIT),
	};
}

export function mapStudentDashboardQueryResults(params: {
	agreements: LessonAgreement[];
	openInvoicesCount: number | null;
	invoiceRows: StudentDashboardInvoice[] | null;
	latestTrial: { status: TrialLessonStatus } | null;
}): StudentDashboardData {
	return assembleStudentDashboardData({
		agreements: params.agreements,
		invoices: params.invoiceRows ?? [],
		openInvoiceCount: params.openInvoicesCount ?? 0,
		latestTrialStatus: params.latestTrial?.status ?? null,
	});
}

export function buildStudentDashboardStatItems(stats: StudentDashboardStats): DashboardStatItem[] {
	return [
		{
			key: 'agreements',
			title: NAV_LABELS.agreements,
			value: stats.activeAgreements,
			icon: NAV_ICONS.agreements,
			href: '/students/my-profile',
			description: inactiveCountDescription(stats.inactiveAgreements),
		},
		{
			key: 'myInvoices',
			title: NAV_LABELS.myInvoices,
			value: stats.openInvoices,
			icon: NAV_ICONS.myInvoices,
			href: '/mijn-facturen',
		},
		{
			key: 'myTrial',
			title: NAV_LABELS.myTrial,
			value: stats.trialCount,
			icon: NAV_ICONS.myTrial,
			href: '/my-trial',
			description: trialStatusDescription(stats.trialStatus),
		},
	];
}
