import { UserPageHeader } from '@/components/ui/user-page-header';
import type { PersonDetailTabId } from '@/lib/profile/personDetailTabsHelpers';
import { TeacherInfoTabs } from '@/pages/teacher-info/TeacherInfoTabs';
import type { Teacher } from '@/types/teachers';

interface TeacherInfoPageContentProps {
	targetTeacherUserId: string;
	teacherProfile: Teacher;
	agreementsCount: number;
	canAccess: boolean;
	activeTab: PersonDetailTabId;
	onTabChange: (tab: PersonDetailTabId) => void;
	onProfileUpdate: () => void;
}

export function TeacherInfoPageContent({
	targetTeacherUserId,
	teacherProfile,
	agreementsCount,
	canAccess,
	activeTab,
	onTabChange,
	onProfileUpdate,
}: TeacherInfoPageContentProps) {
	return (
		<div className="space-y-6">
			<UserPageHeader profile={teacherProfile} />

			<TeacherInfoTabs
				targetTeacherUserId={targetTeacherUserId}
				teacherProfile={teacherProfile}
				agreementsCount={agreementsCount}
				canAccess={canAccess}
				activeTab={activeTab}
				onTabChange={onTabChange}
				onProfileUpdate={onProfileUpdate}
			/>
		</div>
	);
}
