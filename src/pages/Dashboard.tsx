import { useEffect, useState } from 'react';
import { AnnouncementsSection } from '@/components/dashboard/AnnouncementsSection';
import { DashboardInvoiceList } from '@/components/dashboard/DashboardInvoiceList';
import { DashboardListCardSkeleton } from '@/components/dashboard/DashboardListCardSkeleton';
import { RecentStudents } from '@/components/dashboard/RecentStudents';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { TeacherAvailability } from '@/components/dashboard/TeacherAvailability';
import { StudentAgreementsCard } from '@/components/students/StudentProfileCards';
import { NAV_ICONS, NAV_LABELS } from '@/config/nav-labels';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardAudience } from '@/lib/dashboard/dashboardAudienceHelpers';
import type { DashboardStats, DashboardStudent, DashboardTeacher } from '@/lib/dashboard/dashboardDataHelpers';
import {
	fetchProfileFirstName,
	resolveStudentAgreementsCardView,
	studentDashboardPanelModel,
} from '@/lib/dashboard/dashboardPageHelpers';
import { buildDashboardStatItems, DASHBOARD_STAT_KEYS } from '@/lib/dashboard/dashboardStatsGridHelpers';
import { STUDENT_DASHBOARD_STAT_COUNT, type StudentDashboardData } from '@/lib/dashboard/studentDashboardHelpers';
import {
	buildTeacherDashboardStatItems,
	TEACHER_DASHBOARD_STAT_COUNT,
	type TeacherDashboardData,
} from '@/lib/dashboard/teacherDashboardHelpers';

function useProfileFirstName(userId: string | undefined) {
	const [firstName, setFirstName] = useState<string | null>(null);

	useEffect(() => {
		if (!userId) {
			setFirstName(null);
			return;
		}

		let cancelled = false;

		async function sync() {
			const name = await fetchProfileFirstName(async () => {
				const { data } = await supabase.from('profiles').select('first_name').eq('user_id', userId).single();
				return data;
			});
			if (!cancelled) setFirstName(name);
		}

		void sync();
		const handleProfileUpdate = () => {
			void sync();
		};
		window.addEventListener('profile-updated', handleProfileUpdate);
		return () => {
			cancelled = true;
			window.removeEventListener('profile-updated', handleProfileUpdate);
		};
	}, [userId]);

	return firstName;
}

interface DashboardAudiencePanelsProps {
	audience: DashboardAudience;
	stats: DashboardStats | null;
	recentStudents: DashboardStudent[];
	teachers: DashboardTeacher[];
	teacherDashboard: TeacherDashboardData | null;
	studentDashboard: StudentDashboardData | null;
	isLoading: boolean;
	userId: string | undefined;
}

function PrivilegedDashboardPanels({
	stats,
	recentStudents,
	teachers,
	isLoading,
}: Pick<DashboardAudiencePanelsProps, 'stats' | 'recentStudents' | 'teachers' | 'isLoading'>) {
	return (
		<>
			<StatsGrid
				items={stats ? buildDashboardStatItems(stats) : []}
				isLoading={isLoading}
				skeletonCount={DASHBOARD_STAT_KEYS.length}
			/>
			<div className="grid gap-6 md:grid-cols-2">
				<RecentStudents students={recentStudents} isLoading={isLoading} />
				<TeacherAvailability teachers={teachers} isLoading={isLoading} />
			</div>
		</>
	);
}

function TeacherDashboardPanels({
	teacherDashboard,
	recentStudents,
	isLoading,
}: Pick<DashboardAudiencePanelsProps, 'teacherDashboard' | 'recentStudents' | 'isLoading'>) {
	return (
		<>
			<StatsGrid
				items={teacherDashboard ? buildTeacherDashboardStatItems(teacherDashboard.stats) : []}
				isLoading={isLoading}
				skeletonCount={TEACHER_DASHBOARD_STAT_COUNT}
			/>
			<RecentStudents students={recentStudents} isLoading={isLoading} title={NAV_LABELS.myStudents} />
		</>
	);
}

function StudentAgreementsPanel({
	view,
	agreements,
	userId,
}: {
	view: 'skeleton' | 'card';
	agreements: StudentDashboardData['agreements'];
	userId: string | undefined;
}) {
	if (view === 'skeleton') {
		return (
			<DashboardListCardSkeleton
				icon={<NAV_ICONS.agreements className="h-5 w-5 text-primary" />}
				titleWidthClass="w-40"
				itemKeyPrefix="agreement-skeleton"
			/>
		);
	}

	return (
		<StudentAgreementsCard
			agreements={agreements}
			description="Je lessen"
			emptyMessage="Je hebt nog geen overeenkomsten."
			studentUserId={userId}
		/>
	);
}

function StudentDashboardPanels({
	studentDashboard,
	isLoading,
	userId,
}: Pick<DashboardAudiencePanelsProps, 'studentDashboard' | 'isLoading' | 'userId'>) {
	const model = studentDashboardPanelModel(studentDashboard);
	return (
		<>
			<StatsGrid items={model.items} isLoading={isLoading} skeletonCount={STUDENT_DASHBOARD_STAT_COUNT} />
			<div className="grid gap-6 md:grid-cols-2">
				<StudentAgreementsPanel
					view={resolveStudentAgreementsCardView(isLoading, Boolean(studentDashboard))}
					agreements={model.agreements}
					userId={userId}
				/>
				<DashboardInvoiceList invoices={model.invoices} isLoading={isLoading} />
			</div>
		</>
	);
}

function DashboardAudiencePanels(props: DashboardAudiencePanelsProps) {
	if (props.audience === 'privileged') {
		return <PrivilegedDashboardPanels {...props} />;
	}
	if (props.audience === 'teacher') {
		return <TeacherDashboardPanels {...props} />;
	}
	return <StudentDashboardPanels {...props} />;
}

export default function Dashboard() {
	const { user } = useAuth();
	const firstName = useProfileFirstName(user?.id);
	const dashboard = useDashboardData();

	return (
		<div className="space-y-4">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">{NAV_LABELS.dashboard}</h1>
				<p className="text-muted-foreground">
					{firstName ? (
						<>
							Welkom terug, <span className="capitalize">{firstName}</span>
						</>
					) : (
						'Welkom terug'
					)}
				</p>
			</div>

			<AnnouncementsSection />
			<DashboardAudiencePanels userId={user?.id} {...dashboard} />
		</div>
	);
}
