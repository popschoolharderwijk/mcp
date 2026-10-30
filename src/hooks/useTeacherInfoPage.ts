import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useAuth } from '@/hooks/useAuth';
import { countLessonAgreementsByTeacherUserId } from '@/lib/agreements/countLessonAgreements';
import { getDisplayName } from '@/lib/display-name';
import {
	type PersonDetailTabId,
	parsePersonDetailTab,
	resolvePersonDetailTabRoute,
} from '@/lib/profile/personDetailTabsHelpers';
import { fetchTeacherProfile } from '@/lib/teachers/fetchTeacherProfile';
import { canAccessTeacherProfile, resolveTargetTeacherUserId } from '@/lib/teachers/teacherInfoHelpers';
import { resolveTeacherInfoPageGate } from '@/lib/teachers/teacherInfoPageShellHelpers';
import { resolveTeacherInfoBasePath, resolveTeacherInfoTabRedirect } from '@/lib/teachers/teacherInfoTabsHelpers';
import type { Teacher } from '@/types/teachers';

export function useTeacherInfoPage() {
	const { id, tab: tabParam } = useParams<{ id?: string; tab?: string }>();
	const navigate = useNavigate();
	const { isTeacher, teacherUserId, isAdmin, isSiteAdmin, isLoading: authLoading } = useAuth();
	const [loading, setLoading] = useState(true);
	const [teacherProfile, setTeacherProfile] = useState<Teacher | null>(null);
	const [agreementsCount, setAgreementsCount] = useState(0);
	const [profileVersion, setProfileVersion] = useState(0);

	const basePath = resolveTeacherInfoBasePath(id);
	const activeTab = parsePersonDetailTab(tabParam);
	const tabRedirectTo = resolveTeacherInfoTabRedirect(basePath, tabParam);

	const targetTeacherUserId = resolveTargetTeacherUserId({
		routeId: id,
		isTeacher,
		teacherUserId,
		authLoading,
	});

	useEffect(() => {
		if (!targetTeacherUserId) return;
		void profileVersion;

		setLoading(true);
		void Promise.all([
			fetchTeacherProfile(targetTeacherUserId),
			countLessonAgreementsByTeacherUserId(targetTeacherUserId),
		]).then(([profile, count]) => {
			setTeacherProfile(profile);
			setAgreementsCount(count);
			setLoading(false);
		});
	}, [targetTeacherUserId, profileVersion]);

	const { setBreadcrumbSuffix } = useBreadcrumb();
	useEffect(() => {
		if (!teacherProfile) {
			setBreadcrumbSuffix([]);
			return;
		}
		setBreadcrumbSuffix([{ label: getDisplayName(teacherProfile) }]);
		return () => setBreadcrumbSuffix([]);
	}, [teacherProfile, setBreadcrumbSuffix]);

	const canAccess = canAccessTeacherProfile({
		targetTeacherUserId,
		isAdmin,
		isSiteAdmin,
		isTeacher,
		teacherUserId,
	});

	const pageGate = resolveTeacherInfoPageGate({
		authLoading,
		targetTeacherUserId,
		canAccess,
		loading,
		hasProfile: teacherProfile !== null,
	});

	const onTabChange = (tab: PersonDetailTabId) => {
		navigate(resolvePersonDetailTabRoute(basePath, tab), { replace: true });
	};

	return {
		pageGate,
		targetTeacherUserId,
		teacherProfile,
		agreementsCount,
		canAccess,
		activeTab,
		tabRedirectTo,
		onTabChange,
		onProfileUpdate: () => setProfileVersion((version) => version + 1),
	};
}
