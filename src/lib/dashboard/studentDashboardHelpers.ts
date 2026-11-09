import type { LessonAgreement } from '@/components/students/LessonAgreementItem';
import { NAV_LABELS } from '@/config/nav-items';
import type { Enums } from '@/integrations/supabase/types';
import { type DashboardStatItem, inactiveCountDescription } from '@/lib/dashboard/dashboardStatsGridHelpers';
import { getTrialStatusLabel } from '@/lib/trial-lessons/statusLabels';

type TrialLessonStatus = Enums<'trial_lesson_status'>;

export const STUDENT_DASHBOARD_STAT_COUNT = 2;
const DASHBOARD_LIST_LIMIT = 5;

export interface StudentDashboardStats {
	activeAgreements: number;
	inactiveAgreements: number;
	trialCount: number;
	trialStatus: TrialLessonStatus | null;
}

export interface StudentDashboardData {
	stats: StudentDashboardStats;
	agreements: LessonAgreement[];
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
	latestTrialStatus: TrialLessonStatus | null;
}): StudentDashboardData {
	const activeAgreements = countActiveAgreements(params.agreements);
	return {
		stats: {
			activeAgreements,
			inactiveAgreements: params.agreements.length - activeAgreements,
			trialCount: resolveStudentTrialCount(params.latestTrialStatus),
			trialStatus: params.latestTrialStatus,
		},
		agreements: params.agreements.slice(0, DASHBOARD_LIST_LIMIT),
	};
}

export function mapStudentDashboardQueryResults(params: {
	agreements: LessonAgreement[];
	latestTrial: { status: TrialLessonStatus } | null;
}): StudentDashboardData {
	return assembleStudentDashboardData({
		agreements: params.agreements,
		latestTrialStatus: params.latestTrial?.status ?? null,
	});
}

export function buildStudentDashboardStatItems(stats: StudentDashboardStats): DashboardStatItem[] {
	return [
		{
			key: 'agreements',
			title: NAV_LABELS.agreements,
			value: stats.activeAgreements,
			href: '/students/my-profile',
			description: inactiveCountDescription(stats.inactiveAgreements),
		},
		{
			key: 'myTrial',
			title: NAV_LABELS.myTrial,
			value: stats.trialCount,
			href: '/my-trial',
			description: trialStatusDescription(stats.trialStatus),
		},
	];
}
