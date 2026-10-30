import { describe, expect, it } from 'bun:test';
import { buildSidebarMainNavItems } from '../../../src/components/layout/sidebarMainNavHelpers';
import { NAV_ICONS, NAV_LABELS } from '../../../src/config/nav-items';

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
		expect(items.map((item) => item.key)).toEqual(['dashboard', 'my-profile', 'my-trial', 'agenda']);
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
