import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { fetchSignupRequestsByEmail } from '@/lib/signup-requests/signupRequestMappers';
import { fetchStudentAgreementsForProfile } from '@/lib/students/fetchStudentAgreements';

export interface MyStudentProfileData {
	profile: {
		email: string;
		first_name: string | null;
		last_name: string | null;
		phone_number: string | null;
		avatar_url: string | null;
	};
	student: {
		user_id: string;
		parent_name: string | null;
		parent_email: string | null;
		parent_phone_number: string | null;
	};
}

export type MyStudentProfileLoadOutcome =
	| {
			kind: 'success';
			profile: MyStudentProfileData;
			agreements: Awaited<ReturnType<typeof fetchStudentAgreementsForProfile>>;
			signupRequests: Awaited<ReturnType<typeof fetchSignupRequestsByEmail>>;
	  }
	| { kind: 'error' };

const STUDENT_SELECT = 'user_id, parent_name, parent_email, parent_phone_number';
const PROFILE_SELECT = 'email, first_name, last_name, phone_number, avatar_url';

function reportMyStudentProfileLoadError(error: unknown): MyStudentProfileLoadOutcome {
	console.error('Error loading profile:', error);
	toast.error('Fout bij laden profiel');
	return { kind: 'error' };
}

async function fetchMyStudentRecord(userId: string) {
	return supabase.from('students').select(STUDENT_SELECT).eq('user_id', userId).single();
}

async function fetchMyStudentProfileRecord(userId: string) {
	return supabase.from('profiles').select(PROFILE_SELECT).eq('user_id', userId).single();
}

async function loadMyStudentProfileRelatedData(userId: string, email: string | null) {
	const [agreements, signupRequests] = await Promise.all([
		fetchStudentAgreementsForProfile(userId),
		email ? fetchSignupRequestsByEmail(email) : Promise.resolve([]),
	]);
	return { agreements, signupRequests };
}

export async function loadMyStudentProfileData(userId: string): Promise<MyStudentProfileLoadOutcome> {
	try {
		const { data: studentData, error: studentError } = await fetchMyStudentRecord(userId);
		if (studentError) {
			return reportMyStudentProfileLoadError(studentError);
		}

		const { data: profileData, error: profileError } = await fetchMyStudentProfileRecord(userId);
		if (profileError) {
			return reportMyStudentProfileLoadError(profileError);
		}

		const profile: MyStudentProfileData = {
			profile: profileData,
			student: studentData,
		};
		const related = await loadMyStudentProfileRelatedData(userId, profileData.email);

		return { kind: 'success', profile, ...related };
	} catch (error) {
		return reportMyStudentProfileLoadError(error);
	}
}

export function applyMyStudentProfileLoadOutcome(
	outcome: MyStudentProfileLoadOutcome,
	setProfile: (profile: MyStudentProfileData | null) => void,
	setAgreements: (agreements: Awaited<ReturnType<typeof fetchStudentAgreementsForProfile>>) => void,
	setSignupRequests: (requests: Awaited<ReturnType<typeof fetchSignupRequestsByEmail>>) => void,
): boolean {
	if (outcome.kind !== 'success') {
		return false;
	}

	setProfile(outcome.profile);
	setAgreements(outcome.agreements);
	setSignupRequests(outcome.signupRequests);
	return true;
}
