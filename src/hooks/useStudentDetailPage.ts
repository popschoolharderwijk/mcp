import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import {
	resolveStudentDetailTabState,
	resolveStudentInfoTabRoute,
	type StudentInfoTabId,
} from '@/lib/students/studentInfoTabsHelpers';
import type { LessonAgreementWithTeacher } from '@/types/lesson-agreements';
import type { Student } from '@/types/students';

interface UseStudentDetailPageParams {
	authLoading: boolean;
	canView: boolean;
	isPrivileged: boolean;
}

function useStudentDetailTabRouting(authLoading: boolean, isPrivileged: boolean) {
	const { userId, tab: tabParam } = useParams<{ userId: string; tab?: string }>();
	const navigate = useNavigate();
	const { activeTab, tabRedirectTo } = resolveStudentDetailTabState({
		userId,
		tabParam,
		authLoading,
		isPrivileged,
	});

	const onTabChange = useCallback(
		(tab: StudentInfoTabId) => {
			if (!userId) return;
			navigate(resolveStudentInfoTabRoute(userId, tab), { replace: true });
		},
		[navigate, userId],
	);

	return { userId, activeTab, tabRedirectTo, onTabChange };
}

function useStudentDetailBreadcrumb(profile: StudentProfileData | null) {
	const { setBreadcrumbSuffix } = useBreadcrumb();
	useEffect(() => {
		if (!profile) {
			setBreadcrumbSuffix([]);
			return;
		}
		setBreadcrumbSuffix([{ label: getDisplayName(profile) }]);
		return () => setBreadcrumbSuffix([]);
	}, [profile, setBreadcrumbSuffix]);
}

export function useStudentDetailPage(params: UseStudentDetailPageParams) {
	const { userId, activeTab, tabRedirectTo, onTabChange } = useStudentDetailTabRouting(
		params.authLoading,
		params.isPrivileged,
	);
	const [loading, setLoading] = useState(true);
	const [profile, setProfile] = useState<StudentProfileData | null>(null);
	const [student, setStudent] = useState<Student | null>(null);
	const [agreements, setAgreements] = useState<LessonAgreementWithTeacher[]>([]);
	const [signupRequests, setSignupRequests] = useState<SignupRequestDetail[]>([]);
	const hasLoadedContentRef = useRef(false);

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

	useStudentDetailBreadcrumb(profile);

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
		activeTab,
		tabRedirectTo,
		onTabChange,
		onProfileUpdate,
	};
}
