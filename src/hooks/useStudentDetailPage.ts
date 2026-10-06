import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { SignupRequestDetail } from '@/components/students/SignupRequestDialog';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { supabase } from '@/integrations/supabase/client';
import { getDisplayName } from '@/lib/display-name';
import type { StudentProfileData } from '@/lib/students/studentDetailHelpers';
import {
	applyStudentDetailHookLoadOutcome,
	executeStudentDetailHookLoad,
	runStudentDetailPageLoad,
} from '@/lib/students/studentDetailPageLoadHelpers';
import type { LessonAgreementWithTeacher } from '@/types/lesson-agreements';
import type { Student } from '@/types/students';

interface UseStudentDetailPageParams {
	authLoading: boolean;
	canView: boolean;
}

export function useStudentDetailPage(params: UseStudentDetailPageParams) {
	const { userId } = useParams<{ userId: string }>();
	const [loading, setLoading] = useState(true);
	const [profile, setProfile] = useState<StudentProfileData | null>(null);
	const [student, setStudent] = useState<Student | null>(null);
	const [agreements, setAgreements] = useState<LessonAgreementWithTeacher[]>([]);
	const [signupRequests, setSignupRequests] = useState<SignupRequestDetail[]>([]);
	const hasLoadedContentRef = useRef(false);
	const { setBreadcrumbSuffix } = useBreadcrumb();

	useEffect(() => {
		hasLoadedContentRef.current = false;
		setProfile(null);
		setStudent(null);
		setAgreements([]);
		setSignupRequests([]);
		if (userId) setLoading(true);
	}, [userId]);

	const load = useCallback(async () => {
		if (!userId) return;
		if (!hasLoadedContentRef.current) setLoading(true);
		const outcome = await executeStudentDetailHookLoad(() => runStudentDetailPageLoad(supabase, userId));
		applyStudentDetailHookLoadOutcome(outcome, {
			setLoading,
			applySuccess: (result) => {
				setProfile(result.profile);
				setStudent(result.student);
				setAgreements(result.agreements);
				setSignupRequests(result.signupRequests);
				hasLoadedContentRef.current = true;
			},
		});
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

	const onProfileUpdate = useCallback(() => {
		void load();
	}, [load]);

	return {
		userId,
		loading,
		profile,
		student,
		agreements,
		signupRequests,
		onProfileUpdate,
	};
}
