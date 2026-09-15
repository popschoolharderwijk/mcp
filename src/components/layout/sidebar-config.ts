import { NAV_ICONS, NAV_LABELS } from '@/config/nav-labels';

export const NAV_GAP = '0.375rem';

export const adminOperationalNavItems = [
	{ href: '/agreements', label: NAV_LABELS.agreements, icon: NAV_ICONS.agreements },
	{ href: '/lesson-groups', label: NAV_LABELS.lessonGroups, icon: NAV_ICONS.lessonGroups },
	{ href: '/aanmeldingen', label: NAV_LABELS.signupRequests, icon: NAV_ICONS.signupRequests },
	{ href: '/trial-lessons', label: NAV_LABELS.trialLessons, icon: NAV_ICONS.trialLessons },
];

export const financeNavItems = [
	{ href: '/incasso', label: NAV_LABELS.incasso, icon: NAV_ICONS.incasso },
	{ href: '/mandaten', label: NAV_LABELS.mandaten, icon: NAV_ICONS.mandaten },
	{ href: '/facturen', label: NAV_LABELS.invoices, icon: NAV_ICONS.invoices },
	{ href: '/boekhouding', label: NAV_LABELS.accounting, icon: NAV_ICONS.accounting },
];

export const adminNavItems = [
	{ href: '/users', label: NAV_LABELS.users, icon: NAV_ICONS.users },
	{ href: '/lesson-types', label: NAV_LABELS.lessonTypes, icon: NAV_ICONS.lessonTypes },
	{ href: '/data-import', label: NAV_LABELS.dataImport, icon: NAV_ICONS.dataImport },
	{ href: '/lesvrije-periodes', label: NAV_LABELS.noLessonPeriods, icon: NAV_ICONS.noLessonPeriods },
	{ href: '/email-templates', label: NAV_LABELS.emailTemplates, icon: NAV_ICONS.emailTemplates },
	{ href: '/announcements', label: NAV_LABELS.announcements, icon: NAV_ICONS.announcements },
	{ href: '/manual', label: NAV_LABELS.manual, icon: NAV_ICONS.manual },
];

export const adminHrefs = [...adminNavItems, ...financeNavItems].map((item) => item.href);
const financeHrefs = financeNavItems.map((item) => item.href);

export const teacherChildNavItems = [
	{ href: '/teachers/availability', label: NAV_LABELS.availability, icon: NAV_ICONS.availability },
];

export function isPathInGroup(pathname: string, hrefs: string[]): boolean {
	return hrefs.some((href) => pathname === href || pathname.startsWith(`${href}/`));
}

function isSidebarNavActive(pathname: string, href: string, childHrefs: readonly string[] = []): boolean {
	if (childHrefs.some((childHref) => pathname === childHref || pathname.startsWith(`${childHref}/`))) {
		return false;
	}
	if (href === '/') return pathname === '/';
	return pathname === href || pathname.startsWith(`${href}/`);
}

/** Linked parents stay inactive on child routes; toggle-only parents highlight on any child route. */
export function isSidebarParentActive(
	pathname: string,
	href: string | undefined,
	childHrefs: readonly string[] = [],
): boolean {
	if (!href) return isPathInGroup(pathname, [...childHrefs]);
	return isSidebarNavActive(pathname, href, childHrefs);
}

export function sidebarNavItemStateClass(isActive: boolean): string {
	return isActive
		? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
		: 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground';
}

/** Toggle-only parents always flip; linked parents toggle only when already on that page. */
export function nextSidebarGroupOpen(pathname: string, href: string | undefined, currentlyOpen: boolean): boolean {
	if (!href || pathname === href) return !currentlyOpen;
	return true;
}
