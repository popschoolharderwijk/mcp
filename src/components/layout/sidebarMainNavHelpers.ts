import { adminOperationalNavItems, financeNavItems, teacherChildNavItems } from '@/components/layout/sidebar-config';
import { NAV_ICONS, NAV_LABELS } from '@/config/nav-labels';

export const ADMIN_SECTION_KEY = 'admin-section';

export interface SidebarNavLinkConfig {
	key: string;
	href: string;
	label: string;
	icon: typeof NAV_ICONS.dashboard;
}

export interface SidebarNavItemConfig {
	key: string;
	href?: string;
	label: string;
	icon: typeof NAV_ICONS.dashboard;
	children?: SidebarNavLinkConfig[];
}

export interface SidebarMainNavVisibility {
	collapsed: boolean;
	isStudent: boolean;
	isTeacher: boolean;
	showTeachersNav: boolean;
	showStudentsNav: boolean;
	showReportsNav: boolean;
	showProjectsNav: boolean;
	showAdminNav: boolean;
}

function toSidebarNavLinks(
	items: readonly { href: string; label: string; icon: typeof NAV_ICONS.dashboard }[],
): SidebarNavLinkConfig[] {
	return items.map((item) => ({
		key: item.href,
		href: item.href,
		label: item.label,
		icon: item.icon,
	}));
}

export function buildFinanceNavGroup(): SidebarNavItemConfig {
	return {
		key: 'finance',
		label: NAV_LABELS.finance,
		icon: NAV_ICONS.finance,
		children: toSidebarNavLinks(financeNavItems),
	};
}

export function buildSidebarMainNavItems(visibility: SidebarMainNavVisibility): SidebarNavItemConfig[] {
	const items: SidebarNavItemConfig[] = [];

	items.push({ key: 'dashboard', href: '/', label: NAV_LABELS.dashboard, icon: NAV_ICONS.dashboard });

	if (visibility.isStudent) {
		items.push(
			{ key: 'my-profile', href: '/students/my-profile', label: NAV_LABELS.myProfile, icon: NAV_ICONS.myProfile },
			{ key: 'my-trial', href: '/my-trial', label: NAV_LABELS.myTrial, icon: NAV_ICONS.myTrial },
			{ key: 'my-invoices', href: '/mijn-facturen', label: NAV_LABELS.myInvoices, icon: NAV_ICONS.myInvoices },
		);
	}

	items.push({ key: 'agenda', href: '/agenda', label: NAV_LABELS.agenda, icon: NAV_ICONS.agenda });

	if (visibility.showTeachersNav) {
		items.push({
			key: 'teachers',
			href: '/teachers',
			label: NAV_LABELS.teachers,
			icon: NAV_ICONS.teachers,
			children: toSidebarNavLinks(teacherChildNavItems),
		});
	}

	if (visibility.isTeacher && !visibility.showTeachersNav) {
		items.push({
			key: 'my-students',
			href: '/students/my-students',
			label: NAV_LABELS.myStudents,
			icon: NAV_ICONS.myStudents,
		});
	}

	if (visibility.showStudentsNav) {
		items.push({ key: 'students', href: '/students', label: NAV_LABELS.students, icon: NAV_ICONS.students });
	}

	if (visibility.showReportsNav) {
		items.push({ key: 'reports', href: '/reports', label: NAV_LABELS.reports, icon: NAV_ICONS.reports });
	}

	if (visibility.showProjectsNav) {
		items.push({ key: 'projects', href: '/projects', label: NAV_LABELS.projects, icon: NAV_ICONS.projects });
	}

	if (visibility.showAdminNav) {
		items.push(...toSidebarNavLinks(adminOperationalNavItems));
	}

	return items;
}
