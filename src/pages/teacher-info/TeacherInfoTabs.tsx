import { AgendaView } from '@/components/agenda/AgendaView';
import { TeacherAddressSection } from '@/components/teachers/TeacherAddressSection';
import { TeacherInfoProfileTab } from '@/components/teachers/TeacherInfoProfileTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { teacherAddressFieldsFromProfile } from '@/lib/teachers/teacherInfoTabsHelpers';
import type { Teacher } from '@/types/teachers';

interface TeacherInfoTabsProps {
	targetTeacherUserId: string;
	teacherProfile: Teacher;
	canAccess: boolean;
	onProfileUpdate: () => void;
}

export function TeacherInfoTabs({
	targetTeacherUserId,
	teacherProfile,
	canAccess,
	onProfileUpdate,
}: TeacherInfoTabsProps) {
	return (
		<Tabs defaultValue="profile" className="space-y-2">
			<TabsList>
				<TabsTrigger value="profile">Profiel</TabsTrigger>
				<TabsTrigger value="address">Adres</TabsTrigger>
				<TabsTrigger value="agenda">Agenda</TabsTrigger>
			</TabsList>

			<TabsContent value="profile">
				<TeacherInfoProfileTab
					targetTeacherUserId={targetTeacherUserId}
					teacherProfile={teacherProfile}
					canAccess={canAccess}
					onProfileUpdate={onProfileUpdate}
				/>
			</TabsContent>

			<TabsContent value="address">
				<div className="grid gap-6 lg:grid-cols-2">
					<div className="min-w-0">
						<TeacherAddressSection
							userId={teacherProfile.user_id}
							canEdit={canAccess}
							initialAddress={teacherAddressFieldsFromProfile(teacherProfile)}
							onUpdate={onProfileUpdate}
						/>
					</div>
				</div>
			</TabsContent>

			<TabsContent value="agenda">
				<AgendaView userId={targetTeacherUserId} canEdit={canAccess} />
			</TabsContent>
		</Tabs>
	);
}
