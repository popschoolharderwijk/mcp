import { AgendaView } from '@/components/agenda/AgendaView';
import { TeacherAddressSection } from '@/components/teachers/TeacherAddressSection';
import { TeacherInfoProfileTab } from '@/components/teachers/TeacherInfoProfileTab';
import { PageTabs, PageTabsContent } from '@/components/ui/page-tabs';
import {
	isTeacherInfoTabId,
	type TeacherInfoTabId,
	teacherAddressFieldsFromProfile,
} from '@/lib/teachers/teacherInfoTabsHelpers';
import type { Teacher } from '@/types/teachers';

interface TeacherInfoTabsProps {
	targetTeacherUserId: string;
	teacherProfile: Teacher;
	canAccess: boolean;
	activeTab: TeacherInfoTabId;
	onTabChange: (tab: TeacherInfoTabId) => void;
	onProfileUpdate: () => void;
}

const TEACHER_TAB_ITEMS = [
	{ value: 'profile' as const, label: 'Profiel' },
	{ value: 'address' as const, label: 'Adres' },
	{ value: 'agenda' as const, label: 'Agenda' },
];

export function TeacherInfoTabs({
	targetTeacherUserId,
	teacherProfile,
	canAccess,
	activeTab,
	onTabChange,
	onProfileUpdate,
}: TeacherInfoTabsProps) {
	return (
		<PageTabs value={activeTab} onValueChange={onTabChange} isTabId={isTeacherInfoTabId} items={TEACHER_TAB_ITEMS}>
			<PageTabsContent value="profile">
				<TeacherInfoProfileTab
					targetTeacherUserId={targetTeacherUserId}
					teacherProfile={teacherProfile}
					canAccess={canAccess}
					onProfileUpdate={onProfileUpdate}
				/>
			</PageTabsContent>

			<PageTabsContent value="address" panelWidth="half">
				<TeacherAddressSection
					userId={teacherProfile.user_id}
					canEdit={canAccess}
					initialAddress={teacherAddressFieldsFromProfile(teacherProfile)}
					onUpdate={onProfileUpdate}
				/>
			</PageTabsContent>

			<PageTabsContent value="agenda">
				<AgendaView userId={targetTeacherUserId} canEdit={canAccess} />
			</PageTabsContent>
		</PageTabs>
	);
}
