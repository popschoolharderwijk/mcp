import { UserPageHeader } from '@/components/ui/user-page-header';
import { UserDetailTabs } from '@/components/users/UserDetailTabs';
import type { PersonDetailTabId } from '@/lib/profile/personDetailTabsHelpers';
import type { UserDetailUser } from '@/lib/users/userDetailPageHelpers';

interface UserDetailContentProps {
	user: UserDetailUser;
	activeTab: PersonDetailTabId;
	onTabChange: (tab: PersonDetailTabId) => void;
	onUpdate: () => void;
}

export function UserDetailContent({ user, activeTab, onTabChange, onUpdate }: UserDetailContentProps) {
	return (
		<div className="space-y-6">
			<UserPageHeader profile={user} />
			<UserDetailTabs user={user} activeTab={activeTab} onTabChange={onTabChange} onUpdate={onUpdate} />
		</div>
	);
}
