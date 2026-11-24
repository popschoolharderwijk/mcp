import { UserPageHeader } from '@/components/ui/user-page-header';
import { TeacherInfoTabs, type TeacherInfoTabsProps } from '@/pages/teacher-info/TeacherInfoTabs';

export function TeacherInfoPageContent(props: TeacherInfoTabsProps) {
	return (
		<div className="space-y-6">
			<UserPageHeader profile={props.teacherProfile} />
			<TeacherInfoTabs {...props} />
		</div>
	);
}
