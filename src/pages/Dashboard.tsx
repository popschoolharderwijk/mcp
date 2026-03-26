import { useEffect, useState } from 'react';
import { RecentStudents } from '@/components/dashboard/RecentStudents';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { TeacherAvailability } from '@/components/dashboard/TeacherAvailability';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { supabase } from '@/integrations/supabase/client';

export default function Dashboard() {
	const { user, isPrivileged } = useAuth();
	const [firstName, setFirstName] = useState<string | null>(null);
	const { stats, recentStudents, teachers, isLoading } = useDashboardData();

	useEffect(() => {
		async function loadFirstName() {
			if (!user) return;

			const { data } = await supabase.from('profiles').select('first_name').eq('user_id', user.id).single();

			if (data?.first_name) {
				setFirstName(data.first_name);
			}
		}

		loadFirstName();

		const handleProfileUpdate = () => {
			loadFirstName();
		};

		window.addEventListener('profile-updated', handleProfileUpdate);

		return () => {
			window.removeEventListener('profile-updated', handleProfileUpdate);
		};
	}, [user]);

	return (
		<div className="space-y-6 animate-in">
			{/* Page header */}
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
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

			{/* Privileged users (admin, site_admin, staff) see full dashboard */}
			{isPrivileged && (
				<>
					{/* Stats Grid */}
					<StatsGrid stats={stats} isLoading={isLoading} />

					{/* Two-column section */}
					<div className="grid gap-6 md:grid-cols-2">
						<RecentStudents students={recentStudents} isLoading={isLoading} />
						<TeacherAvailability teachers={teachers} isLoading={isLoading} />
					</div>
				</>
			)}
		</div>
	);
}
