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
		expect(items.map((item) => item.key)).toEqual(['dashboard', 'agenda', 'profile', 'my-trial']);
	});

	it('puts agenda above profile for everyone', () => {
		const items = buildSidebarMainNavItems({ ...baseVisibility, showAdminNav: true });
		expect(items.map((item) => item.key).slice(0, 3)).toEqual(['dashboard', 'agenda', 'profile']);
		expect(items.find((item) => item.key === 'profile')?.href).toBe('/profile');
	});

	it('includes teacher my-students for teachers without admin teacher nav', () => {
		const items = buildSidebarMainNavItems({
			...baseVisibility,
			isTeacher: true,
			showReportsNav: true,
		});
		expect(items.map((item) => item.key)).toEqual(['dashboard', 'agenda', 'profile', 'my-students', 'reports']);
	});

	it('includes admin operational items when admin nav is visible', () => {
		const items = buildSidebarMainNavItems({ ...baseVisibility, showAdminNav: true });
		expect(items.map((item) => item.href)).toEqual([
			'/',
			'/agenda',
			'/profile',
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
