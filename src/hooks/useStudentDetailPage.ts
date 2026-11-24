import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { SignupRequestDetail } from '@/components/students/SignupRequestDialog';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getDisplayName } from '@/lib/display-name';
import type { StudentProfileData } from '@/lib/students/studentDetailHelpers';
import {
	applyStudentDetailHookLoadOutcome,
	executeStudentDetailHookLoad,
	runStudentDetailPageLoad,
} from '@/lib/students/studentDetailPageLoadHelpers';
import {
	resolveStudentDetailRouteState,
	resolveStudentInfoTabRoute,
	type StudentInfoTabId,
} from '@/lib/students/studentInfoTabsHelpers';
import type { LessonAgreementWithTeacher } from '@/types/lesson-agreements';
import type { Student } from '@/types/students';

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

export function useStudentDetailPage() {
	const { userId: routeUserId, tab: tabParam } = useParams<{ userId?: string; tab?: string }>();
	const navigate = useNavigate();
	const { user, isPrivileged, isTeacher, isLoading: authLoading } = useAuth();

	const route = resolveStudentDetailRouteState({
		routeUserId,
		viewerUserId: user?.id,
		isPrivileged,
		isTeacher,
		tabParam,
		authLoading,
	});

	const onTabChange = useCallback(
		(tab: StudentInfoTabId) => {
			if (!route.basePath) return;
			navigate(resolveStudentInfoTabRoute(route.basePath, tab), { replace: true });
		},
		[navigate, route.basePath],
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
		if (route.userId) setLoading(true);
	}, [route.userId]);

	const load = useCallback(async () => {
		if (!route.userId) return;
		if (!hasLoadedContentRef.current) setLoading(true);
		const outcome = await executeStudentDetailHookLoad(() => runStudentDetailPageLoad(supabase, route.userId));
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
	}, [route.userId]);

	useEffect(() => {
		if (!authLoading && route.access.canView) void load();
	}, [authLoading, route.access.canView, load]);

	useStudentDetailBreadcrumb(profile);

	const onProfileUpdate = useCallback(() => {
		void load();
	}, [load]);

	return {
		authLoading,
		userId: route.userId,
		loading,
		profile,
		student,
		agreements,
		signupRequests,
		activeTab: route.activeTab,
		tabRedirectTo: route.tabRedirectTo,
		canView: route.access.canView,
		canEditAgenda: route.access.canEditAgenda,
		canViewPersonalData: route.access.canViewPersonalData,
		canManagePersonalData: route.access.canManagePersonalData,
		includeAgenda: route.includeAgenda,
		isPrivileged,
		onTabChange,
		onProfileUpdate,
	};
}
