import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PageHeader } from '@/components/ui/page-header';
import { getUserInitials } from '@/components/ui/user-display';
import { getDisplayName } from '@/lib/display-name';
import type { TeacherInfoTabId } from '@/lib/teachers/teacherInfoTabsHelpers';
import { TeacherInfoTabs } from '@/pages/teacher-info/TeacherInfoTabs';
import type { Teacher } from '@/types/teachers';

interface TeacherInfoPageContentProps {
	targetTeacherUserId: string;
	teacherProfile: Teacher;
	canAccess: boolean;
	activeTab: TeacherInfoTabId;
	onTabChange: (tab: TeacherInfoTabId) => void;
	onProfileUpdate: () => void;
}

export function TeacherInfoPageContent({
	targetTeacherUserId,
	teacherProfile,
	canAccess,
	activeTab,
	onTabChange,
	onProfileUpdate,
}: TeacherInfoPageContentProps) {
	return (
		<div className="space-y-6">
			<PageHeader
				icon={
					<Avatar className="h-16 w-16">
						<AvatarImage
							src={teacherProfile.avatar_url ?? undefined}
							alt={getDisplayName(teacherProfile)}
						/>
						<AvatarFallback className="bg-primary/10 text-primary text-xl">
							{getUserInitials(teacherProfile)}
						</AvatarFallback>
					</Avatar>
				}
				title={getDisplayName(teacherProfile)}
				subtitle={teacherProfile.email}
			/>

			<TeacherInfoTabs
				targetTeacherUserId={targetTeacherUserId}
				teacherProfile={teacherProfile}
				canAccess={canAccess}
				activeTab={activeTab}
				onTabChange={onTabChange}
				onProfileUpdate={onProfileUpdate}
			/>
		</div>
	);
}
