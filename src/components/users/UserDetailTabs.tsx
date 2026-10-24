import { AgendaView } from '@/components/agenda/AgendaView';
import { ProfileAddressSection } from '@/components/profile/ProfileAddressSection';
import { PageTabs, PageTabsContent } from '@/components/ui/page-tabs';
import { UserProfileSection } from '@/components/users/UserProfileSection';
import {
	isPersonDetailTabId,
	PERSON_DETAIL_TAB_ITEMS,
	type PersonDetailTabId,
} from '@/lib/profile/personDetailTabsHelpers';
import { profileAddressFieldsFromRow } from '@/lib/profile/profileAddressSectionHelpers';
import type { UserDetailUser } from '@/lib/users/userDetailPageHelpers';

interface UserDetailTabsProps {
	user: UserDetailUser;
	activeTab: PersonDetailTabId;
	onTabChange: (tab: PersonDetailTabId) => void;
	onUpdate: () => void;
}

export function UserDetailTabs({ user, activeTab, onTabChange, onUpdate }: UserDetailTabsProps) {
	return (
		<PageTabs
			value={activeTab}
			onValueChange={onTabChange}
			isTabId={isPersonDetailTabId}
			items={PERSON_DETAIL_TAB_ITEMS}
		>
			<PageTabsContent value="profile" panelWidth="1/2">
				<UserProfileSection user={user} onUpdate={onUpdate} />
			</PageTabsContent>

			<PageTabsContent value="address" panelWidth="1/2">
				<ProfileAddressSection
					userId={user.user_id}
					canEdit
					initialAddress={profileAddressFieldsFromRow(user)}
					onUpdate={onUpdate}
					idPrefix="user-address"
				/>
			</PageTabsContent>

			<PageTabsContent value="agenda">
				<AgendaView userId={user.user_id} canEdit />
			</PageTabsContent>
		</PageTabs>
	);
}
