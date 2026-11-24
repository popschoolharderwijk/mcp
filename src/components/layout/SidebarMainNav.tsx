import { SidebarNavBranch } from '@/components/layout/SidebarNavBranch';
import { buildSidebarMainNavItems } from '@/components/layout/sidebarMainNavHelpers';

interface SidebarMainNavProps {
	collapsed: boolean;
	isStudent: boolean;
	isTeacher: boolean;
	showTeachersNav: boolean;
	showStudentsNav: boolean;
	showReportsNav: boolean;
	showProjectsNav: boolean;
	showAdminNav: boolean;
}

export function SidebarMainNav({
	collapsed,
	isStudent,
	isTeacher,
	showTeachersNav,
	showStudentsNav,
	showReportsNav,
	showProjectsNav,
	showAdminNav,
}: SidebarMainNavProps) {
	const items = buildSidebarMainNavItems({
		collapsed,
		isStudent,
		isTeacher,
		showTeachersNav,
		showStudentsNav,
		showReportsNav,
		showProjectsNav,
		showAdminNav,
	});

	return (
		<>
			{items.map((item) => (
				<SidebarNavBranch key={item.key} item={item} collapsed={collapsed} />
			))}
		</>
	);
}
