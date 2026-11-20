import { useCallback, useEffect, useState } from 'react';
import type { LessonAgreement } from '@/components/students/LessonAgreementItem';
import type { SignupRequestDetail } from '@/components/students/SignupRequestDialog';
import { useAuth } from '@/hooks/useAuth';
import {
	applyMyStudentProfileLoadOutcome,
	loadMyStudentProfileData,
	type MyStudentProfileData,
} from '@/lib/students/myStudentProfileLoadHelpers';

export function useMyStudentProfilePage() {
	const { user, activeProfileId, isLoading: authLoading } = useAuth();
	const [loading, setLoading] = useState(true);
	const [profile, setProfile] = useState<MyStudentProfileData | null>(null);
	const [agreements, setAgreements] = useState<LessonAgreement[]>([]);
	const [signupRequests, setSignupRequests] = useState<SignupRequestDetail[]>([]);

	const loadProfile = useCallback(async () => {
		if (!activeProfileId) return;

		setLoading(true);
		const outcome = await loadMyStudentProfileData(activeProfileId);
		applyMyStudentProfileLoadOutcome(outcome, setProfile, setAgreements, setSignupRequests);
		setLoading(false);
	}, [activeProfileId]);

	useEffect(() => {
		if (!authLoading && activeProfileId) {
			void loadProfile();
		}
	}, [authLoading, activeProfileId, loadProfile]);

	return {
		user,
		authLoading,
		loading,
		profile,
		agreements,
		signupRequests,
	};
}
