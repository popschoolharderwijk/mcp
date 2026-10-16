import { TeacherAvailabilitySection } from '@/components/teachers/TeacherAvailabilitySection';
import { TeacherLessonTypesSection } from '@/components/teachers/TeacherLessonTypesSection';
import { TeacherProfileSection } from '@/components/teachers/TeacherProfileSection';
import type { Teacher } from '@/types/teachers';

interface TeacherInfoProfileTabProps {
	targetTeacherUserId: string;
	teacherProfile: Teacher;
	canAccess: boolean;
	onProfileUpdate: () => void;
}

export function TeacherInfoProfileTab({
	targetTeacherUserId,
	teacherProfile,
	canAccess,
	onProfileUpdate,
}: TeacherInfoProfileTabProps) {
	return (
		<div className="grid gap-6 lg:grid-cols-2">
			<div className="space-y-6 min-w-0">
				<TeacherProfileSection
					teacherUserId={targetTeacherUserId}
					user_id={teacherProfile.user_id}
					canEdit={canAccess}
					onUpdate={onProfileUpdate}
					initialBio={teacherProfile.bio}
					initialFirstName={teacherProfile.first_name}
					initialLastName={teacherProfile.last_name}
					initialEmail={teacherProfile.email}
					initialPhoneNumber={teacherProfile.phone_number}
					initialCocIssuedOn={teacherProfile.coc_issued_on}
				/>
				<TeacherLessonTypesSection teacherUserId={targetTeacherUserId} canEdit={canAccess} />
				<div className="text-xs italic text-muted-foreground space-y-1">
					<p>Aangemaakt: {new Date(teacherProfile.created_at).toLocaleString('nl-NL')}</p>
					<p>Laatst bijgewerkt: {new Date(teacherProfile.updated_at).toLocaleString('nl-NL')}</p>
				</div>
			</div>

			<div className="min-w-0">
				<TeacherAvailabilitySection teacherUserId={targetTeacherUserId} canEdit={canAccess} />
			</div>
		</div>
	);
}
