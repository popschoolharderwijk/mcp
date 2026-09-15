import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { resolveDashboardAudience } from '@/lib/dashboard/dashboardAudienceHelpers';
import {
	dashboardStateAfterLoad,
	emptyDashboardViewData,
	loadDashboardAudienceData,
} from '@/lib/dashboard/dashboardAudienceLoadHelpers';
import type { DashboardStudent, DashboardTeacher } from '@/lib/dashboard/dashboardDataHelpers';
import { fetchDashboardData } from '@/lib/dashboard/dashboardDataLoadHelpers';
import { fetchStudentDashboardData } from '@/lib/dashboard/studentDashboardLoadHelpers';
import { fetchTeacherDashboardData } from '@/lib/dashboard/teacherDashboardLoadHelpers';

export type { DashboardStudent, DashboardTeacher };

export function useDashboardData() {
	const { isLoading: authLoading, isPrivileged, isTeacher, teacherUserId, user } = useAuth();
	const audience = resolveDashboardAudience(isPrivileged, isTeacher);
	const [data, setData] = useState(emptyDashboardViewData);
	const [isLoading, setIsLoading] = useState(true);

	const loadData = useCallback(async () => {
		setIsLoading(true);
		try {
			const result = await loadDashboardAudienceData(
				{ audience, teacherUserId, userId: user?.id },
				{
					privileged: (isPrivilegedUser) => fetchDashboardData(supabase, isPrivilegedUser),
					teacher: (id) => fetchTeacherDashboardData(supabase, id),
					student: (id) => fetchStudentDashboardData(supabase, id),
				},
			);
			setData((current) => dashboardStateAfterLoad(current, result));
		} catch (err) {
			console.error('Error loading dashboard data:', err);
			toast.error('Fout bij laden dashboard');
			setData(emptyDashboardViewData);
		} finally {
			setIsLoading(false);
		}
	}, [audience, teacherUserId, user]);

	useEffect(() => {
		if (!authLoading) {
			void loadData();
		}
	}, [authLoading, loadData]);

	return {
		audience,
		...data,
		isLoading: isLoading || authLoading,
	};
}
