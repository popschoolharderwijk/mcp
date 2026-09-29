import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import type { SignupRequestDetail } from '@/components/students/SignupRequestDialog';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { supabase } from '@/integrations/supabase/client';
import { getDisplayName } from '@/lib/display-name';
import type { StudentProfileData } from '@/lib/students/studentDetailHelpers';
import { runStudentDetailPageLoad } from '@/lib/students/studentDetailPageLoadHelpers';
import type { LessonAgreementWithTeacher } from '@/types/lesson-agreements';

interface UseStudentDetailPageParams {
	authLoading: boolean;
	canView: boolean;
}

export function useStudentDetailPage(params: UseStudentDetailPageParams) {
	const { userId } = useParams<{ userId: string }>();
	const [loading, setLoading] = useState(true);
	const [profile, setProfile] = useState<StudentProfileData | null>(null);
	const [agreements, setAgreements] = useState<LessonAgreementWithTeacher[]>([]);
	const [signupRequests, setSignupRequests] = useState<SignupRequestDetail[]>([]);
	const { setBreadcrumbSuffix } = useBreadcrumb();

	const load = useCallback(async () => {
		if (!userId) return;
		setLoading(true);
		try {
			const result = await runStudentDetailPageLoad(supabase, userId);
			if (!result) {
				setLoading(false);
				return;
			}
			setProfile(result.profile);
			setAgreements(result.agreements);
			setSignupRequests(result.signupRequests);
			setLoading(false);
		} catch (error) {
			console.error(error);
			toast.error('Fout bij laden leerling');
			setLoading(false);
		}
	}, [userId]);

	useEffect(() => {
		if (!params.authLoading && params.canView) void load();
	}, [params.authLoading, params.canView, load]);

	useEffect(() => {
		if (!profile) {
			setBreadcrumbSuffix([]);
			return;
		}
		setBreadcrumbSuffix([{ label: getDisplayName(profile) }]);
		return () => setBreadcrumbSuffix([]);
	}, [profile, setBreadcrumbSuffix]);

	return {
		userId,
		loading,
		profile,
		agreements,
		signupRequests,
	};
}
