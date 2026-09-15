import type { SupabaseClient } from '@supabase/supabase-js';
import type { LessonAgreement } from '@/components/students/LessonAgreementItem';
import { assertDashboardQueriesOk, DashboardLoadError } from '@/lib/dashboard/dashboardLoadErrorPure';
import {
	mapStudentDashboardQueryResults,
	type StudentDashboardData,
	type StudentDashboardInvoice,
} from '@/lib/dashboard/studentDashboardHelpers';
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
	const [agreements, openInvoicesRes, invoicesRes, trialRes] = await Promise.all([
		loadStudentAgreements(studentUserId),
		supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'issued'),
		supabase
			.from('invoices')
			.select('id, invoice_number, issue_date, status, amount_total_cents')
			.order('issue_date', { ascending: false })
			.limit(5),
		supabase
			.from('trial_lessons')
			.select('status')
			.eq('student_user_id', studentUserId)
			.order('scheduled_date', { ascending: false })
			.limit(1)
			.maybeSingle(),
	]);

	assertDashboardQueriesOk([
		{ label: 'open invoices count', error: openInvoicesRes.error },
		{ label: 'recent invoices', error: invoicesRes.error },
		{ label: 'latest trial', error: trialRes.error },
	]);

	return mapStudentDashboardQueryResults({
		agreements,
		openInvoicesCount: openInvoicesRes.count,
		invoiceRows: invoicesRes.data as StudentDashboardInvoice[] | null,
		latestTrial: trialRes.data,
	});
}
