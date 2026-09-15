import { describe, expect, it } from 'bun:test';
import { buildFinanceNavGroup, buildSidebarMainNavItems } from '../../../src/components/layout/sidebarMainNavHelpers';
import { NAV_ICONS, NAV_LABELS } from '../../../src/config/nav-labels';

describe('buildSidebarMainNavItems', () => {
	const baseVisibility = {
		collapsed: false,
		isStudent: false,
		isTeacher: false,
		showTeachersNav: false,
		showStudentsNav: false,
		showReportsNav: false,
		showProjectsNav: false,
		showAdminNav: false,
	};

	it('returns student nav items for students', () => {
		const items = buildSidebarMainNavItems({ ...baseVisibility, isStudent: true });
		expect(items.map((item) => item.key)).toEqual(['dashboard', 'my-profile', 'my-trial', 'my-invoices', 'agenda']);
	});

	it('returns dashboard and agenda for non-students', () => {
		const items = buildSidebarMainNavItems(baseVisibility);
		expect(items.map((item) => item.key)).toEqual(['dashboard', 'agenda']);
	});

	it('includes teacher my-students link for teachers without admin teacher nav', () => {
		const items = buildSidebarMainNavItems({ ...baseVisibility, isTeacher: true, showReportsNav: true });
		expect(items.map((item) => item.key)).toEqual(['dashboard', 'agenda', 'my-students', 'reports']);
	});

	it('includes admin operational items when admin nav is visible', () => {
		const items = buildSidebarMainNavItems({ ...baseVisibility, showAdminNav: true });
		expect(items.map((item) => item.href)).toEqual([
			'/',
			'/agenda',
			'/agreements',
			'/lesson-groups',
			'/aanmeldingen',
			'/trial-lessons',
		]);
	});

	it('nests availability under teachers when teacher nav is visible', () => {
		const items = buildSidebarMainNavItems({ ...baseVisibility, showTeachersNav: true });
		expect(items.find((item) => item.key === 'teachers')).toEqual({
			key: 'teachers',
			href: '/teachers',
			label: NAV_LABELS.teachers,
			icon: NAV_ICONS.teachers,
			children: [
				{
					key: '/teachers/availability',
					href: '/teachers/availability',
					label: NAV_LABELS.availability,
					icon: NAV_ICONS.availability,
				},
			],
		});
	});
});

describe('buildFinanceNavGroup', () => {
	it('builds a toggle-only parent with finance children', () => {
		expect(buildFinanceNavGroup()).toEqual({
			key: 'finance',
			label: NAV_LABELS.finance,
			icon: NAV_ICONS.finance,
			children: [
				{ key: '/incasso', href: '/incasso', label: NAV_LABELS.incasso, icon: NAV_ICONS.incasso },
				{ key: '/mandaten', href: '/mandaten', label: NAV_LABELS.mandaten, icon: NAV_ICONS.mandaten },
				{ key: '/facturen', href: '/facturen', label: NAV_LABELS.invoices, icon: NAV_ICONS.invoices },
				{ key: '/boekhouding', href: '/boekhouding', label: NAV_LABELS.accounting, icon: NAV_ICONS.accounting },
			],
		});
	});
});
