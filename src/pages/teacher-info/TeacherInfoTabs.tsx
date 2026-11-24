import { AgendaView } from '@/components/agenda/AgendaView';
import { ScopedAgreementsTable } from '@/components/agreements/ScopedAgreementsTable';
import { ProfileAddressSection } from '@/components/profile/ProfileAddressSection';
import { TeacherAvailabilitySection } from '@/components/teachers/TeacherAvailabilitySection';
import { TeacherInfoProfileTab } from '@/components/teachers/TeacherInfoProfileTab';
import { PageTabs, PageTabsContent } from '@/components/ui/page-tabs';
import { useAuth } from '@/hooks/useAuth';
import {
	buildTeacherDetailTabItems,
	isPersonDetailTabId,
	type PersonDetailTabId,
} from '@/lib/profile/personDetailTabsHelpers';
import { profileAddressFieldsFromRow } from '@/lib/profile/profileAddressSectionHelpers';
import type { Teacher } from '@/types/teachers';

export interface TeacherInfoTabsProps {
	targetTeacherUserId: string;
	teacherProfile: Teacher;
	agreementsCount: number;
	availabilityCount: number;
	canAccess: boolean;
	includeAgenda: boolean;
	activeTab: PersonDetailTabId;
	onTabChange: (tab: PersonDetailTabId) => void;
	onProfileUpdate: () => void;
	onAvailabilityMutated: () => void;
}

export function TeacherInfoTabs({
	targetTeacherUserId,
	teacherProfile,
	agreementsCount,
	availabilityCount,
	canAccess,
	includeAgenda,
	activeTab,
	onTabChange,
	onProfileUpdate,
	onAvailabilityMutated,
}: TeacherInfoTabsProps) {
	const { isPrivileged } = useAuth();

	return (
		<PageTabs
			value={activeTab}
			onValueChange={onTabChange}
			isTabId={isPersonDetailTabId}
			items={buildTeacherDetailTabItems(agreementsCount, availabilityCount, { includeAgenda })}
		>
			<PageTabsContent value="profile" panelWidth="1/2">
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

			<PageTabsContent value="agreements">
				<ScopedAgreementsTable
					teacherUserId={targetTeacherUserId}
					canMutate={isPrivileged}
					onAgreementsMutated={onProfileUpdate}
				/>
			</PageTabsContent>

			<PageTabsContent value="availability" panelWidth="1/2">
				<TeacherAvailabilitySection
					teacherUserId={targetTeacherUserId}
					canEdit={canAccess}
					onBlocksMutated={onAvailabilityMutated}
				/>
			</PageTabsContent>

			{includeAgenda ? (
				<PageTabsContent value="agenda">
					<AgendaView userId={targetTeacherUserId} canEdit={canAccess} />
				</PageTabsContent>
			) : null}
		</PageTabs>
	);
}
