import type { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import type { SignupRequestDetail } from '@/components/students/SignupRequestDialog';
import type { Tables } from '@/integrations/supabase/types';
import { PROFILE_ADDRESS_SELECT } from '@/lib/profile/profileAddressHelpers';
import { fetchSignupRequestsByEmail } from '@/lib/signup-requests/signupRequestMappers';
import { fetchStudentAgreementsWithRelations } from '@/lib/students/fetchStudentAgreements';
import type { StudentProfileData } from '@/lib/students/studentDetailHelpers';
import type { LessonAgreementWithTeacher } from '@/types/lesson-agreements';
import type { Student } from '@/types/students';

type StudentRow = Tables<'students'>;

export interface StudentDetailPageLoadResult {
	profile: StudentProfileData;
	student: Student;
	agreements: LessonAgreementWithTeacher[];
	signupRequests: SignupRequestDetail[];
}

async function loadStudentProfileForDetailPage(
	supabase: SupabaseClient,
	userId: string,
): Promise<StudentProfileData | null> {
	const { data, error } = await supabase
		.from('profiles')
		.select(`user_id, email, first_name, last_name, phone_number, avatar_url, ${PROFILE_ADDRESS_SELECT}`)
		.eq('user_id', userId)
		.maybeSingle();

	if (error || !data) return null;
	return data as unknown as StudentProfileData;
}

async function loadStudentRowForDetailPage(supabase: SupabaseClient, userId: string): Promise<StudentRow | null> {
	const { data, error } = await supabase.from('students').select('*').eq('user_id', userId).maybeSingle();

	if (error || !data) return null;
	return data;
}

export function mergeStudentDetailRecord(profile: StudentProfileData, studentRow: StudentRow): Student {
	return {
		...studentRow,
		user_id: profile.user_id,
		email: profile.email,
		first_name: profile.first_name,
		last_name: profile.last_name,
		phone_number: profile.phone_number,
		avatar_url: profile.avatar_url,
		street_name: profile.street_name,
		house_number: profile.house_number,
		postal_code: profile.postal_code,
		city: profile.city,
		country_code: profile.country_code,
	};
}

export async function runStudentDetailPageLoad(
	supabase: SupabaseClient,
	userId: string,
): Promise<StudentDetailPageLoadResult | null> {
	const [profileData, studentRow] = await Promise.all([
		loadStudentProfileForDetailPage(supabase, userId),
		loadStudentRowForDetailPage(supabase, userId),
	]);

	if (!profileData || !studentRow) {
		toast.error('Leerling niet gevonden');
		return null;
	}

	const [agreementsData, signupData] = await Promise.all([
		fetchStudentAgreementsWithRelations(userId),
		profileData.email ? fetchSignupRequestsByEmail(profileData.email) : Promise.resolve([]),
	]);

	return {
		profile: profileData,
		student: mergeStudentDetailRecord(profileData, studentRow),
		agreements: agreementsData,
		signupRequests: signupData,
	};
}

export type StudentDetailHookLoadOutcome =
	| { kind: 'empty' }
	| { kind: 'success'; result: StudentDetailPageLoadResult }
	| { kind: 'error'; error: unknown };

export async function executeStudentDetailHookLoad(
	runLoad: () => Promise<StudentDetailPageLoadResult | null>,
): Promise<StudentDetailHookLoadOutcome> {
	try {
		const result = await runLoad();
		if (!result) return { kind: 'empty' };
		return { kind: 'success', result };
	} catch (error) {
		return { kind: 'error', error };
	}
}

export function applyStudentDetailHookLoadOutcome(
	outcome: StudentDetailHookLoadOutcome,
	handlers: {
		setLoading: (loading: boolean) => void;
		applySuccess: (result: StudentDetailPageLoadResult) => void;
	},
): void {
	if (outcome.kind === 'error') {
		console.error(outcome.error);
		toast.error('Fout bij laden leerling');
		handlers.setLoading(false);
		return;
	}
	if (outcome.kind === 'empty') {
		handlers.setLoading(false);
		return;
	}
	handlers.applySuccess(outcome.result);
	handlers.setLoading(false);
}
