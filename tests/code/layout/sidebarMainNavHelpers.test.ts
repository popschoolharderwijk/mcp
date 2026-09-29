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
			'/signup-requests',
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
				{
					key: '/direct-debit',
					href: '/direct-debit',
					label: NAV_LABELS.directDebit,
					icon: NAV_ICONS.directDebit,
				},
				{ key: '/mandates', href: '/mandates', label: NAV_LABELS.mandates, icon: NAV_ICONS.mandates },
				{ key: '/invoices', href: '/invoices', label: NAV_LABELS.invoices, icon: NAV_ICONS.invoices },
				{ key: '/accounting', href: '/accounting', label: NAV_LABELS.accounting, icon: NAV_ICONS.accounting },
			],
		});
	});
});
