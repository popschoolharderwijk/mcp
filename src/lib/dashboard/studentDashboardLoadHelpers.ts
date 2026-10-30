import type { SupabaseClient } from '@supabase/supabase-js';
import type { LessonAgreement } from '@/components/students/LessonAgreementItem';
import { assertDashboardQueriesOk, DashboardLoadError } from '@/lib/dashboard/dashboardLoadErrorHelpers';
import { mapStudentDashboardQueryResults, type StudentDashboardData } from '@/lib/dashboard/studentDashboardHelpers';
import { fetchStudentAgreementsForProfile } from '@/lib/students/fetchStudentAgreements';

async function loadStudentAgreements(studentUserId: string): Promise<LessonAgreement[]> {
	try {
		return await fetchStudentAgreementsForProfile(studentUserId);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		throw new DashboardLoadError(`agreements: ${message}`);
	}
}

export async function fetchStudentDashboardData(
	supabase: SupabaseClient,
	studentUserId: string,
): Promise<StudentDashboardData> {
	const [agreements, trialRes] = await Promise.all([
		loadStudentAgreements(studentUserId),
		supabase
			.from('trial_lessons')
			.select('status')
			.eq('student_user_id', studentUserId)
			.order('scheduled_date', { ascending: false })
			.limit(1)
			.maybeSingle(),
	]);

	assertDashboardQueriesOk([{ label: 'latest trial', error: trialRes.error }]);

	return mapStudentDashboardQueryResults({
		agreements,
		latestTrial: trialRes.data,
	});
}
