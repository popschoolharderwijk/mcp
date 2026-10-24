import { AgendaView } from '@/components/agenda/AgendaView';
import { ProfileAddressSection } from '@/components/profile/ProfileAddressSection';
import { TeacherInfoProfileTab } from '@/components/teachers/TeacherInfoProfileTab';
import { PageTabs, PageTabsContent } from '@/components/ui/page-tabs';
import {
	isPersonDetailTabId,
	PERSON_DETAIL_TAB_ITEMS,
	type PersonDetailTabId,
} from '@/lib/profile/personDetailTabsHelpers';
import { profileAddressFieldsFromRow } from '@/lib/profile/profileAddressSectionHelpers';
import type { Teacher } from '@/types/teachers';

interface TeacherInfoTabsProps {
	targetTeacherUserId: string;
	teacherProfile: Teacher;
	canAccess: boolean;
	activeTab: PersonDetailTabId;
	onTabChange: (tab: PersonDetailTabId) => void;
	onProfileUpdate: () => void;
}

export function TeacherInfoTabs({
	targetTeacherUserId,
	teacherProfile,
	canAccess,
	activeTab,
	onTabChange,
	onProfileUpdate,
}: TeacherInfoTabsProps) {
	return (
		<PageTabs
			value={activeTab}
			onValueChange={onTabChange}
			isTabId={isPersonDetailTabId}
			items={PERSON_DETAIL_TAB_ITEMS}
		>
			<PageTabsContent value="profile">
				<TeacherInfoProfileTab
					targetTeacherUserId={targetTeacherUserId}
					teacherProfile={teacherProfile}
					canAccess={canAccess}
					onProfileUpdate={onProfileUpdate}
				/>
			</PageTabsContent>

			<PageTabsContent value="address" panelWidth="1/2">
				<ProfileAddressSection
					userId={teacherProfile.user_id}
					canEdit={canAccess}
					initialAddress={profileAddressFieldsFromRow(teacherProfile)}
					onUpdate={onProfileUpdate}
					idPrefix="teacher-address"
				/>
			</PageTabsContent>

			<PageTabsContent value="agenda">
				<AgendaView userId={targetTeacherUserId} canEdit={canAccess} />
			</PageTabsContent>
		</PageTabs>
	);
}
