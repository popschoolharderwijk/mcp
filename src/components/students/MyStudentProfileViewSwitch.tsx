import { Navigate } from 'react-router-dom';
import type { LessonAgreement } from '@/components/students/LessonAgreementItem';
import { MyStudentProfileContent } from '@/components/students/MyStudentProfileContent';
import type { SignupRequestDetail } from '@/components/students/SignupRequestDialog';
import { PageShell } from '@/components/ui/page-shell';
import { NAV_LABELS } from '@/config/nav-labels';
import type { MyStudentProfileView } from '@/lib/students/myStudentProfileHelpers';
import type { MyStudentProfileData } from '@/lib/students/myStudentProfileLoadHelpers';
import { resolveMyStudentProfileRenderedView } from '@/lib/students/myStudentProfileViewHelpers';

interface MyStudentProfileViewSwitchProps {
	view: MyStudentProfileView;
	profile: MyStudentProfileData | null;
	agreements: LessonAgreement[];
	signupRequests: SignupRequestDetail[];
}

export function MyStudentProfileViewSwitch({
	view,
	profile,
	agreements,
	signupRequests,
}: MyStudentProfileViewSwitchProps) {
	const renderedView = resolveMyStudentProfileRenderedView(view, profile);

	if (renderedView === 'redirect') {
		return <Navigate to="/" replace />;
	}

	if (renderedView === 'skeleton') {
		return (
			<PageShell
				title={NAV_LABELS.myProfile}
				description="Bekijk je profielgegevens en lesovereenkomsten"
				loading
			/>
		);
	}

	return (
		<MyStudentProfileContent
			profile={profile as MyStudentProfileData}
			agreements={agreements}
			signupRequests={signupRequests}
		/>
	);
}
